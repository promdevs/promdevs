import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { isIP } from "node:net";
import {
  CATALOG_ID_MAX,
  catalogKinds,
  catalogInputs,
  catalogVersionSchema,
  catalogQuerySchema,
  catalogStateSchema,
  ADMIN_PASSWORD_MIN_LENGTH,
  contactSchema,
  loginSchema,
  projectInputSchema,
  adminAccountSchema,
  adminAccountUpdateSchema,
  adminPasswordChangeSchema,
  adminUsersQuerySchema,
  adminInviteSchema,
  invitationTokenSchema,
  invitationAcceptSchema,
  type ContactInput,
  draftProjectInputSchema,
  draftProjectUpdateSchema,
  projectStateInputSchema,
  portfolioQuerySchema,
  quickClientInputSchema,
  quickContributorInputSchema,
} from "@promdevs/contracts";
import { sessionCookie, sessionToken } from "./auth.js";
import { Authentication } from "./access-control/authentication.js";
import type { AuthStore } from "./access-control/auth-store.js";
import {
  userHasPermission,
  type AdminPermission,
} from "./access-control/roles.js";
import { HttpError } from "./errors.js";
import { RateLimiter } from "./rate-limit.js";
import type { ProjectStore } from "./projects.js";
import { Accounts } from "./access-control/accounts.js";
import {
  databaseAccountsStore,
  type AccountsStore,
} from "./access-control/accounts-store.js";
import {
  Invitations,
  type InvitationMailer,
} from "./access-control/invitations.js";
import {
  databaseInvitationsStore,
  type InvitationsStore,
} from "./access-control/invitations-store.js";
import { invitationMailer } from "./email/invitations.js";
import { databasePortfolioStore, type PortfolioStore } from "./portfolio.js";
import {
  projectMediaUploader,
  receiveProjectMedia,
  type MediaUploader,
} from "./storage/project-media.js";
import { StorageError } from "./storage/config.js";

import { databaseCatalogStore, type CatalogStore } from "./catalog.js";

type Options = {
  store: ProjectStore;
  authStore: AuthStore;
  accountsStore?: AccountsStore;
  invitationsStore?: InvitationsStore;
  invitationMailer?: InvitationMailer;
  portfolioStore?: PortfolioStore;
  catalogStore?: CatalogStore;
  mediaUploader?: MediaUploader;
  sendEmail: (input: ContactInput) => Promise<unknown>;
  adminOrigin: string;
  secureCookies: boolean;
  trustProxy: boolean;
};

function readJson(request: IncomingMessage, max = 64 * 1024): Promise<unknown> {
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    request.resume();
    return Promise.reject(new HttpError(415, "Send application/json."));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    const fail = (error: HttpError) => {
      if (failed) return;
      failed = true;
      clearTimeout(timer);
      chunks.length = 0;
      reject(error);
    };
    // Slow uploads get a longer deadline, not ordinary JSON requests.
    const timer = setTimeout(() => {
      fail(new HttpError(408, "Request body timed out."));
      request.resume();
    }, 15000);
    timer.unref();
    request.on("data", (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > max) {
        fail(new HttpError(413, "Request is too large."));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (failed) return;
      clearTimeout(timer);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "Invalid JSON."));
      }
    });
    request.on("error", () =>
      fail(new HttpError(400, "Unable to read request.")),
    );
    request.on("aborted", () =>
      fail(new HttpError(400, "Request was interrupted.")),
    );
  });
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || !error) return false;
  if ("code" in error && error.code === "23505") return true;
  return (
    "cause" in error && error.cause !== error && isUniqueViolation(error.cause)
  );
}

export function createApiServer(options: Options) {
  const authentication = new Authentication(options.authStore);
  const limiter = new RateLimiter();
  const origin = new URL(options.adminOrigin).origin;
  if (options.secureCookies && !origin.startsWith("https://"))
    throw new Error("Production admin origin must use HTTPS");
  const accounts = new Accounts(options.accountsStore ?? databaseAccountsStore);
  const portfolio = options.portfolioStore ?? databasePortfolioStore;
  const catalog = options.catalogStore ?? databaseCatalogStore;
  const media = options.mediaUploader ?? projectMediaUploader;
  let activeUploads = 0;
  const invitations = new Invitations(
    options.invitationsStore ?? databaseInvitationsStore,
    options.invitationMailer ?? invitationMailer,
    origin,
  );

  const server = createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    response.setHeader("Referrer-Policy", "no-referrer");
    const ip = (() => {
      if (options.trustProxy) {
        const forwarded = String(request.headers["x-forwarded-for"] || "")
          .split(",")[0]
          ?.trim();
        if (forwarded && isIP(forwarded)) return forwarded;
      }
      return request.socket.remoteAddress || "unknown";
    })();
    const limited = (
      key: string,
      maximum: number,
      windowMs = 10 * 60 * 1000,
    ) => {
      const result = limiter.take(key, maximum, windowMs);
      if (!result.allowed) {
        response.setHeader("Retry-After", String(result.retryAfter));
        throw new HttpError(429, "Too many requests. Please try again later.");
      }
    };
    const requireOrigin = () => {
      if (request.headers.origin !== origin)
        throw new HttpError(403, "Request origin is not allowed.");
    };
    const requireSession = async (permission?: AdminPermission) => {
      const session = await authentication.session(
        sessionToken(request.headers.cookie),
      );
      if (!session) throw new HttpError(401, "Please sign in.");
      if (permission && !userHasPermission(session, permission))
        throw new HttpError(403, "You do not have permission for this action.");
      return session;
    };

    void (async () => {
      const method = request.method;
      const pathname = new URL(request.url || "/", "http://api.local").pathname;
      if (method === "GET" && pathname === "/health") {
        json(response, 200, { status: "ok", service: "promdevs-api" });
        return;
      }
      if (method === "POST" && pathname === "/api/contact") {
        limited(`contact:${ip}`, 5);
        const parsed = contactSchema.safeParse(await readJson(request));
        if (!parsed.success)
          throw new HttpError(
            400,
            parsed.error.issues[0]?.message || "Invalid input.",
          );
        if (parsed.data.company.trim())
          throw new HttpError(400, "Invalid submission.");
        await options.sendEmail(parsed.data);
        json(response, 200, { message: "Thanks, your message has been sent." });
        return;
      }
      if (method === "GET" && pathname === "/api/projects") {
        limited(`read:${ip}`, 120, 60000);
        json(response, 200, { projects: await options.store.list() });
        return;
      }
      if (method === "GET" && pathname.startsWith("/api/projects/")) {
        limited(`read:${ip}`, 120, 60000);
        const slug = decodeURIComponent(
          pathname.slice("/api/projects/".length),
        );
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
          throw new HttpError(404, "Project not found.");
        const project = await options.store.bySlug(slug);
        if (!project) throw new HttpError(404, "Project not found.");
        json(response, 200, { project });
        return;
      }
      if (method === "POST" && pathname === "/api/admin/login") {
        requireOrigin();
        limited(`login:${ip}`, 5);
        limited("login:global", 50);
        const parsed = loginSchema.safeParse(await readJson(request));
        if (!parsed.success)
          throw new HttpError(400, "Enter a valid email and password.");
        const { identity, token } = await authentication.login(
          parsed.data.email,
          parsed.data.password,
          sessionToken(request.headers.cookie),
        );
        response.setHeader(
          "Set-Cookie",
          sessionCookie(token, options.secureCookies),
        );
        json(response, 200, { email: identity.email });
        return;
      }
      if (
        method === "POST" &&
        [
          "/api/admin/invitations/preview",
          "/api/admin/invitations/accept",
        ].includes(pathname)
      ) {
        requireOrigin();
        limited(`invite:${ip}`, 10);
        limited("invite:global", 100);
        if (pathname.endsWith("/preview")) {
          const parsed = invitationTokenSchema.safeParse(
            await readJson(request),
          );
          if (!parsed.success)
            throw new HttpError(
              400,
              "This invitation is invalid, expired, or no longer available.",
            );
          json(response, 200, {
            invitation: await invitations.preview(parsed.data.token),
          });
        } else {
          const parsed = invitationAcceptSchema.safeParse(
            await readJson(request),
          );
          if (!parsed.success)
            throw new HttpError(
              400,
              `Use a matching, nonblank password of ${ADMIN_PASSWORD_MIN_LENGTH} to 1024 characters and a valid invitation.`,
            );
          await invitations.accept(parsed.data.token, parsed.data.password);
          json(response, 200, {
            message: "Your account is ready. Sign in with your new password.",
          });
        }
        return;
      }
      if (method === "GET" && pathname === "/api/admin/me") {
        const { id, email, role } = await requireSession();
        json(response, 200, { id, email, role });
        return;
      }
      if (method === "GET" && pathname === "/api/admin/session") {
        json(response, 200, { email: (await requireSession()).email });
        return;
      }
      if (method === "POST" && pathname === "/api/admin/logout") {
        requireOrigin();
        await authentication.logout(sessionToken(request.headers.cookie));
        response.setHeader(
          "Set-Cookie",
          sessionCookie("", options.secureCookies, true),
        );
        json(response, 200, { message: "Signed out." });
        return;
      }
      if (method === "POST" && pathname === "/api/admin/password") {
        requireOrigin();
        const actor = await requireSession();
        limited(`password:${actor.id}`, 5);
        const parsed = adminPasswordChangeSchema.safeParse(
          await readJson(request),
        );
        if (!parsed.success)
          throw new HttpError(
            400,
            `Use a different, matching password of ${ADMIN_PASSWORD_MIN_LENGTH} to 1024 characters.`,
          );
        await accounts.changePassword(actor, parsed.data);
        response.setHeader(
          "Set-Cookie",
          sessionCookie("", options.secureCookies, true),
        );
        json(response, 200, {
          message:
            "Password changed. Sign in again; all existing sessions have been revoked.",
        });
        return;
      }
      if (
        pathname === "/api/admin/users" ||
        pathname.startsWith("/api/admin/users/")
      ) {
        const actor = await requireSession("users.read");
        if (method === "GET" && pathname === "/api/admin/users") {
          limited(`users:${actor.id}`, 60, 60000);
          const search = new URL(request.url || "/", "http://api.local")
            .searchParams;
          if ([...search.keys()].some((key) => search.getAll(key).length > 1))
            throw new HttpError(400, "Invalid pagination.");
          const parsed = adminUsersQuerySchema.safeParse(
            Object.fromEntries(search),
          );
          if (!parsed.success) throw new HttpError(400, "Invalid pagination.");
          json(
            response,
            200,
            await accounts.list(actor, parsed.data.limit, parsed.data.offset),
          );
          return;
        }
        requireOrigin();
        limited(`accounts:${actor.id}`, 30, 60000);
        if (method === "POST" && pathname === "/api/admin/users/invitations") {
          limited(`send-invite:${actor.id}`, 10);
          const parsed = adminInviteSchema.safeParse(await readJson(request));
          if (!parsed.success)
            throw new HttpError(400, "Enter a valid name, email and role.");
          json(response, 201, {
            user: await invitations.create(actor, parsed.data),
            message: "Invitation sent. The link expires in 72 hours.",
          });
          return;
        }
        const suffix = pathname.slice("/api/admin/users/".length).split("/");
        const id = suffix[0];
        if (!adminAccountSchema.shape.id.safeParse(id).success)
          throw new HttpError(400, "Invalid administrator ID.");
        if (method === "PATCH" && suffix.length === 1) {
          const parsed = adminAccountUpdateSchema.safeParse(
            await readJson(request),
          );
          if (!parsed.success)
            throw new HttpError(
              400,
              "Choose a valid name, role or account status.",
            );
          json(response, 200, {
            user: await accounts.update(actor, id, parsed.data),
          });
          return;
        }
        if (
          method === "POST" &&
          suffix.slice(1).join("/") === "sessions/revoke"
        ) {
          await accounts.revokeSessions(actor, id);
          if (id === actor.id)
            response.setHeader(
              "Set-Cookie",
              sessionCookie("", options.secureCookies, true),
            );
          json(response, 200, { message: "All sessions revoked." });
          return;
        }
        if (method === "POST" && suffix.slice(1).join("/") === "invitation") {
          limited(`send-invite:${actor.id}`, 10);
          json(response, 200, {
            user: await invitations.resend(actor, id),
            message:
              "A new invitation was sent. Previous links are no longer valid.",
          });
          return;
        }
        throw new HttpError(405, "Method not allowed.");
      }
      if (pathname.startsWith("/api/admin/catalog/")) {
        let actor = await requireSession("content.read");
        limited(`catalog-read:${actor.id}`, 120, 60000);
        const parts = pathname.slice("/api/admin/catalog/".length).split("/");
        const search = new URL(request.url || "/", "http://api.local")
          .searchParams;
        if ([...search.keys()].some((k) => search.getAll(k).length > 1))
          throw new HttpError(400, "Invalid filters.");
        if (parts[0] === "options" && parts.length === 1 && method === "GET") {
          const q = search.get("q") || "";
          const parseId = (key: string) => {
            const value = search.get(key);
            if (value === null) return undefined;
            if (
              !/^[1-9]\d*$/.test(value) ||
              !Number.isSafeInteger(Number(value)) ||
              Number(value) > CATALOG_ID_MAX
            )
              throw new HttpError(400, "Invalid selection.");
            return Number(value);
          };
          if (
            q.length > 160 ||
            [...search.keys()].some(
              (k) => !["q", "clientId", "projectId"].includes(k),
            )
          )
            throw new HttpError(400, "Invalid filters.");
          json(
            response,
            200,
            await catalog.options(q, parseId("clientId"), parseId("projectId")),
          );
          return;
        }
        const kind = catalogKinds.find((k) => k === parts[0]);
        if (!kind) throw new HttpError(404, "Page not found.");
        if (
          method === "POST" &&
          parts.length === 2 &&
          parts[1] === "media" &&
          (kind === "clients" || kind === "skills")
        ) {
          requireOrigin();
          if (
            !userHasPermission(actor, "media.upload") ||
            !userHasPermission(actor, "content.create")
          )
            throw new HttpError(403, "You cannot upload images.");
          limited(`catalog-upload:${actor.id}`, 10);
          if (activeUploads >= 2) {
            request.resume();
            throw new HttpError(
              503,
              "Two uploads are already processing. Try again shortly.",
            );
          }
          media.ready();
          activeUploads++;
          try {
            const file = await receiveProjectMedia(request, true);
            let uploaded: Awaited<ReturnType<MediaUploader["upload"]>>;
            try {
              uploaded = await media.upload(file, kind);
              try {
                actor = await requireSession("media.upload");
                await catalog.auditUpload(actor, kind, uploaded.key);
              } catch (error) {
                await media
                  .remove(uploaded.key)
                  .catch(() => console.error("[api] Upload cleanup failed"));
                throw error;
              }
            } finally {
              await file.cleanup();
            }
            json(response, 201, { media: uploaded });
          } finally {
            activeUploads--;
          }
          return;
        }
        const id =
          parts[1] && /^[1-9]\d*$/.test(parts[1])
            ? Number(parts[1])
            : undefined;
        if (
          parts[1] &&
          (!id || !Number.isSafeInteger(id) || id > CATALOG_ID_MAX)
        )
          throw new HttpError(400, "Invalid record ID.");
        if (method === "GET" && parts.length === 1) {
          const parsed = catalogQuerySchema.safeParse(
            Object.fromEntries(search),
          );
          if (!parsed.success) throw new HttpError(400, "Invalid filters.");
          json(response, 200, {
            ...(await catalog.list(kind, parsed.data)),
            limit: parsed.data.limit,
            offset: parsed.data.offset,
          });
          return;
        }
        if (method === "GET" && id && parts.length === 2) {
          const record = await catalog.get(kind, id);
          if (!record) throw new HttpError(404, "Record not found.");
          json(response, 200, { record });
          return;
        }
        requireOrigin();
        limited(`catalog-write:${actor.id}`, 30, 60000);
        if (method === "POST" && parts.length === 1) {
          if (!userHasPermission(actor, "content.create"))
            throw new HttpError(403, "You cannot create records.");
          const parsed = catalogInputs[kind].safeParse(await readJson(request));
          if (!parsed.success)
            throw new HttpError(
              400,
              parsed.error.issues[0]?.message || "Invalid input.",
            );
          json(response, 201, {
            record: await catalog.save(actor, kind, parsed.data),
          });
          return;
        }
        if (method === "PUT" && id && parts.length === 2) {
          if (kind !== "reviews" && actor.role === "editor")
            throw new HttpError(
              403,
              "Owners and admins manage shared records. Editors can create and view them.",
            );
          const body = await readJson(request);
          if (
            typeof body !== "object" ||
            !body ||
            !("record" in body) ||
            !("expectedUpdatedAt" in body) ||
            Object.keys(body).some(
              (k) => !["record", "expectedUpdatedAt"].includes(k),
            )
          )
            throw new HttpError(400, "Invalid update.");
          const parsed = catalogInputs[kind].safeParse(body.record);
          const version = catalogVersionSchema.safeParse(
            body.expectedUpdatedAt,
          );
          if (!parsed.success || !version.success)
            throw new HttpError(
              400,
              !parsed.success
                ? parsed.error.issues[0]?.message || "Invalid input."
                : "Reload before saving.",
            );
          json(response, 200, {
            record: await catalog.save(
              actor,
              kind,
              parsed.data,
              id,
              version.data,
            ),
          });
          return;
        }
        if (
          method === "POST" &&
          id &&
          parts.length === 3 &&
          parts[2] === "state"
        ) {
          if (actor.role === "editor")
            throw new HttpError(
              403,
              "Only owners and admins can archive or restore records.",
            );
          const parsed = catalogStateSchema.safeParse(await readJson(request));
          if (
            !parsed.success ||
            kind === "skills" ||
            !["archived", kind === "reviews" ? "draft" : "active"].includes(
              parsed.data.state,
            )
          )
            throw new HttpError(400, "Invalid state change.");
          json(response, 200, {
            record: await catalog.state(
              actor,
              kind,
              id,
              parsed.data.state,
              parsed.data.expectedUpdatedAt,
            ),
          });
          return;
        }
        throw new HttpError(404, "Endpoint not found.");
      }
      if (
        pathname === "/api/admin/portfolio" ||
        pathname.startsWith("/api/admin/portfolio/")
      ) {
        let actor = await requireSession("content.read");
        limited(`portfolio-read:${actor.id}`, 120, 60000);
        const parts = pathname.slice("/api/admin/portfolio/".length).split("/");
        if (method === "GET" && parts[0] === "options" && parts.length === 1) {
          json(response, 200, await portfolio.options());
          return;
        }
        if (parts[0] === "projects" && method === "GET" && parts.length === 1) {
          const search = new URL(request.url || "/", "http://api.local")
            .searchParams;
          if ([...search.keys()].some((key) => search.getAll(key).length > 1))
            throw new HttpError(400, "Invalid project filters.");
          const parsed = portfolioQuerySchema.safeParse(
            Object.fromEntries(search),
          );
          if (!parsed.success)
            throw new HttpError(400, "Invalid project filters.");
          json(response, 200, {
            ...(await portfolio.list(parsed.data)),
            limit: parsed.data.limit,
            offset: parsed.data.offset,
          });
          return;
        }
        const id =
          parts[1] && /^[1-9]\d*$/.test(parts[1]) ? Number(parts[1]) : null;
        if (id !== null && !Number.isSafeInteger(id))
          throw new HttpError(400, "Invalid project ID.");
        if (
          parts[0] === "projects" &&
          id &&
          method === "GET" &&
          parts.length === 2
        ) {
          const project = await portfolio.get(id);
          if (!project) throw new HttpError(404, "Project not found.");
          json(response, 200, { project });
          return;
        }
        requireOrigin();
        limited(`portfolio-write:${actor.id}`, 30, 60000);
        if (
          parts[0] === "projects" &&
          id &&
          parts[2] === "media" &&
          parts.length === 3 &&
          method === "POST"
        ) {
          if (!userHasPermission(actor, "media.upload"))
            throw new HttpError(403, "You cannot upload media.");
          const project = await portfolio.get(id);
          if (!project) throw new HttpError(404, "Project not found.");
          if (project.publicationStatus !== "draft")
            throw new HttpError(409, "Upload media only to draft projects.");
          limited(`project-upload:${actor.id}`, 10);
          if (activeUploads >= 2) {
            request.resume();
            throw new HttpError(
              503,
              "Two uploads are already processing. Try again shortly.",
            );
          }
          media.ready();
          activeUploads++;
          try {
            const file = await receiveProjectMedia(request);
            let uploaded: Awaited<ReturnType<MediaUploader["upload"]>>;
            try {
              uploaded = await media.upload(file);
              try {
                actor = await requireSession("media.upload");
                await portfolio.auditUpload(actor, id, uploaded.key);
              } catch (error) {
                await media
                  .remove(uploaded.key)
                  .catch(() => console.error("[api] Upload cleanup failed"));
                throw error;
              }
            } finally {
              await file.cleanup();
            }
            json(response, 201, { media: uploaded });
          } finally {
            activeUploads--;
          }
          return;
        }
        if (
          method === "POST" &&
          ["clients", "contributors"].includes(parts[0]) &&
          parts.length === 1
        ) {
          if (!userHasPermission(actor, "content.create"))
            throw new HttpError(
              403,
              "You cannot create project relationships.",
            );
          const parsed = (
            parts[0] === "clients"
              ? quickClientInputSchema
              : quickContributorInputSchema
          ).safeParse(await readJson(request));
          if (!parsed.success)
            throw new HttpError(
              400,
              parsed.error.issues[0]?.message || "Invalid relationship.",
            );
          const referenceId = await portfolio.quickCreate(
            actor,
            parts[0] as "clients" | "contributors",
            parsed.data,
          );
          json(response, 201, { id: referenceId });
          return;
        }
        if (
          parts[0] === "projects" &&
          method === "POST" &&
          parts.length === 1
        ) {
          if (!userHasPermission(actor, "content.create"))
            throw new HttpError(403, "You cannot create projects.");
          const parsed = draftProjectInputSchema.safeParse(
            await readJson(request, 256 * 1024),
          );
          if (!parsed.success)
            throw new HttpError(
              400,
              parsed.error.issues[0]?.message || "Invalid draft.",
            );
          json(response, 201, {
            project: await portfolio.save(actor, parsed.data),
          });
          return;
        }
        if (
          parts[0] === "projects" &&
          id &&
          method === "PUT" &&
          parts.length === 2
        ) {
          if (!userHasPermission(actor, "content.edit_draft"))
            throw new HttpError(403, "You cannot edit drafts.");
          const parsed = draftProjectUpdateSchema.safeParse(
            await readJson(request, 256 * 1024),
          );
          if (!parsed.success)
            throw new HttpError(
              400,
              parsed.error.issues[0]?.message || "Invalid draft.",
            );
          json(response, 200, {
            project: await portfolio.save(
              actor,
              parsed.data.project,
              id,
              parsed.data.expectedUpdatedAt,
            ),
          });
          return;
        }
        if (
          parts[0] === "projects" &&
          id &&
          parts[2] === "state" &&
          parts.length === 3 &&
          method === "POST"
        ) {
          if (!userHasPermission(actor, "content.delete"))
            throw new HttpError(
              403,
              "Only owners and admins can archive or restore projects.",
            );
          const parsed = projectStateInputSchema.safeParse(
            await readJson(request),
          );
          if (!parsed.success)
            throw new HttpError(
              400,
              "Choose draft or archived with the current project version. Publishing is not available yet.",
            );
          json(response, 200, {
            project: await portfolio.state(
              actor,
              id,
              parsed.data.state,
              parsed.data.expectedUpdatedAt,
            ),
          });
          return;
        }
        throw new HttpError(
          405,
          "This project-management action is not available.",
        );
      }
      if (
        pathname === "/api/admin/projects" ||
        /^\/api\/admin\/projects\/[1-9]\d*$/.test(pathname)
      ) {
        const actor = await requireSession("content.read");
        if (method === "GET" && pathname === "/api/admin/projects") {
          json(response, 200, { projects: await options.store.list("admin") });
          return;
        }
        requireOrigin();
        limited(`write:${ip}`, 60, 60000);
        if (
          (method === "POST" && pathname === "/api/admin/projects") ||
          (method === "PUT" && pathname !== "/api/admin/projects")
        ) {
          if (
            !userHasPermission(
              actor,
              method === "POST" ? "content.create" : "content.edit_draft",
            )
          )
            throw new HttpError(
              403,
              "You do not have permission for this action.",
            );
          const parsed = projectInputSchema.safeParse(await readJson(request));
          if (!parsed.success)
            throw new HttpError(
              400,
              parsed.error.issues[0]?.message || "Invalid project.",
            );
          const id = Number(pathname.split("/").at(-1));
          if (method === "PUT" && !Number.isSafeInteger(id))
            throw new HttpError(400, "Invalid project ID.");
          const project =
            method === "POST"
              ? await options.store.create(parsed.data)
              : await options.store.update(id, parsed.data, {
                  draftsOnly: !userHasPermission(
                    actor,
                    "content.edit_published",
                  ),
                });
          if (!project) throw new HttpError(404, "Project not found.");
          json(response, method === "POST" ? 201 : 200, { project });
          return;
        }
        if (method === "DELETE" && pathname !== "/api/admin/projects") {
          if (!userHasPermission(actor, "content.delete"))
            throw new HttpError(
              403,
              "You do not have permission for this action.",
            );
          const id = Number(pathname.split("/").at(-1));
          if (!Number.isSafeInteger(id))
            throw new HttpError(400, "Invalid project ID.");
          if (!(await options.store.remove(id, actor.id)))
            throw new HttpError(404, "Project not found.");
          json(response, 200, { message: "Project deleted." });
          return;
        }
        throw new HttpError(405, "Method not allowed.");
      }
      throw new HttpError(404, "Endpoint not found.");
    })().catch((error) => {
      if (response.writableEnded || response.destroyed) return;
      if (error instanceof HttpError) {
        json(response, error.status, { error: error.message });
        return;
      }
      if (error instanceof URIError) {
        json(response, 400, { error: "Invalid URL." });
        return;
      }
      if (error instanceof StorageError) {
        json(response, error.kind === "input" ? 400 : 503, {
          error: error.message,
        });
        return;
      }
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "23503"
      ) {
        json(response, 409, {
          error:
            "This relationship is missing or protected by linked reviews. Reload and check the project's client and contributors.",
        });
        return;
      }
      if (isUniqueViolation(error)) {
        json(response, 409, { error: "This project slug is already in use." });
        return;
      }
      // Never expose provider errors, query text, request bodies, or credentials.
      console.error("[api] Request failed", {
        method: request.method,
        path: request.url?.split("?")[0],
      });
      json(response, 500, { error: "Something went wrong. Please try again." });
    });
  });
  server.requestTimeout = 180000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
