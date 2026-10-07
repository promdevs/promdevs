import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { isIP } from "node:net";
import {
  contactSchema,
  loginSchema,
  projectInputSchema,
  type ContactInput,
} from "@promdevs/contracts";
import {
  Sessions,
  isPasswordHash,
  sessionToken,
  verifyPassword,
} from "./auth.js";
import { HttpError } from "./errors.js";
import { RateLimiter } from "./rate-limit.js";
import type { ProjectStore } from "./projects.js";

type Options = {
  store: ProjectStore;
  sendEmail: (input: ContactInput) => Promise<unknown>;
  adminOrigin: string;
  adminEmail: string;
  passwordHash: string;
  secureCookies: boolean;
  trustProxy: boolean;
};

function readJson(request: IncomingMessage): Promise<unknown> {
  const max = 64 * 1024;
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    request.resume();
    return Promise.reject(new HttpError(415, "Send application/json."));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    request.on("data", (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > max) {
        failed = true;
        chunks.length = 0;
        reject(new HttpError(413, "Request is too large."));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (failed) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "Invalid JSON."));
      }
    });
    request.on("error", () =>
      reject(new HttpError(400, "Unable to read request.")),
    );
    request.on("aborted", () =>
      reject(new HttpError(400, "Request was interrupted.")),
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
  const sessions = new Sessions();
  const limiter = new RateLimiter();
  const authConfigured =
    !!options.adminEmail && isPasswordHash(options.passwordHash);
  const origin = new URL(options.adminOrigin).origin;

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
    const requireSession = () => {
      if (!authConfigured)
        throw new HttpError(503, "Admin access is not configured.");
      const session = sessions.get(sessionToken(request.headers.cookie));
      if (!session) throw new HttpError(401, "Please sign in.");
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
        if (!authConfigured)
          throw new HttpError(
            503,
            "Admin access is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH on the API.",
          );
        limited(`login:${ip}`, 5);
        limited("login:global", 50);
        const parsed = loginSchema.safeParse(await readJson(request));
        if (!parsed.success)
          throw new HttpError(400, "Enter a valid email and password.");
        // Derive the hash even for a wrong email to avoid an account-existence timing signal.
        const correctPassword = await verifyPassword(
          parsed.data.password,
          options.passwordHash,
        );
        if (
          parsed.data.email.toLowerCase() !==
            options.adminEmail.toLowerCase() ||
          !correctPassword
        )
          throw new HttpError(401, "Invalid email or password.");
        const previous = sessionToken(request.headers.cookie);
        if (previous) sessions.remove(previous);
        const token = sessions.create(options.adminEmail);
        response.setHeader(
          "Set-Cookie",
          sessions.cookie(token, options.secureCookies),
        );
        json(response, 200, { email: options.adminEmail });
        return;
      }
      if (method === "GET" && pathname === "/api/admin/session") {
        json(response, 200, { email: requireSession().email });
        return;
      }
      if (method === "POST" && pathname === "/api/admin/logout") {
        requireOrigin();
        sessions.remove(sessionToken(request.headers.cookie));
        response.setHeader(
          "Set-Cookie",
          sessions.cookie("", options.secureCookies, true),
        );
        json(response, 200, { message: "Signed out." });
        return;
      }
      if (
        pathname === "/api/admin/projects" ||
        /^\/api\/admin\/projects\/[1-9]\d*$/.test(pathname)
      ) {
        requireSession();
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
              : await options.store.update(id, parsed.data);
          if (!project) throw new HttpError(404, "Project not found.");
          json(response, method === "POST" ? 201 : 200, { project });
          return;
        }
        if (method === "DELETE" && pathname !== "/api/admin/projects") {
          const id = Number(pathname.split("/").at(-1));
          if (!Number.isSafeInteger(id))
            throw new HttpError(400, "Invalid project ID.");
          if (!(await options.store.remove(id)))
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
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
