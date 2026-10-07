import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import {
  draftProjectInputSchema,
  destinationKind,
  projectDuration,
  MAX_PROJECT_VIDEO_BYTES,
} from "@promdevs/contracts";
import { createApiServer } from "../src/server.js";
import { hashPassword } from "../src/auth.js";
import { MemoryAuth, MemoryProjects } from "./fixtures.js";
import { MemoryPortfolio } from "./portfolio-fixtures.js";
import { validateProbe, type TempMedia } from "../src/storage/project-media.js";
import { portfolioSaveSql, portfolioStateSql } from "../src/portfolio.js";
import { validateImage } from "../src/storage/policy.js";
import { HttpError } from "../src/errors.js";
import { request as httpRequest } from "node:http";
async function fixture(role: "owner" | "admin" | "editor" = "owner") {
  const auth = new MemoryAuth();
  const id = randomUUID();
  const password = "isolated password";
  auth.users.set(id, {
    id,
    email: "test@example.test",
    role,
    status: "active",
    authVersion: 1,
    passwordHash: await hashPassword(password),
  });
  const portfolio = new MemoryPortfolio(auth);
  let uploaded: TempMedia | undefined;
  let removed: string | undefined;
  let invalidate = false;
  const server = createApiServer({
    store: new MemoryProjects(),
    authStore: auth,
    portfolioStore: portfolio,
    adminOrigin: "http://admin.test",
    secureCookies: false,
    trustProxy: false,
    sendEmail: async () => {},
    mediaUploader: {
      ready: () => {},
      upload: async (file) => {
        uploaded = file;
        if (file.type === "image")
          validateImage(await readFile(file.path), file.contentType);
        if (invalidate) auth.users.get(id)!.status = "disabled";
        return {
          key: "images/projects/test.png",
          src: "https://media.example.test/test.png",
          width: 24,
          height: 24,
          type: file.type,
          size: file.size,
          contentType: file.contentType,
        };
      },
      remove: async (key) => {
        removed = key;
      },
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = "";
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    origin = "http://admin.test",
    overrideCookie = cookie,
  ) {
    return fetch(base + "/api/admin/portfolio" + path, {
      method,
      headers: {
        Cookie: overrideCookie,
        Origin: origin,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  const login = await fetch(base + "/api/admin/login", {
    method: "POST",
    headers: {
      Origin: "http://admin.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: "test@example.test", password }),
  });
  cookie = login.headers.get("set-cookie")!.split(";")[0];
  return {
    auth,
    id,
    portfolio,
    request,
    base,
    cookie,
    get uploaded() {
      return uploaded;
    },
    get removed() {
      return removed;
    },
    invalidateUpload() {
      invalidate = true;
    },
    async close() {
      server.close();
      server.closeAllConnections();
      await once(server, "close");
    },
  };
}
test("draft contracts require only title, reject publication injection, invalid dates and unsafe URLs", () => {
  const input = draftProjectInputSchema.parse({ title: "Rough idea" });
  assert.equal(input.slug, null);
  assert.equal(input.year, null);
  assert.equal(input.showClient, false);
  assert.deepEqual(input.skillIds, []);
  for (const invalid of [
    { title: "" },
    { title: "Draft", publicationStatus: "published" },
    { title: "Draft", publishedAt: "now" },
    { title: "Draft", skillIds: [1, 1] },
    { title: "Draft", liveUrl: "https://user:password@example.test" },
    { title: "Draft", showClient: true },
    { title: "Draft", timeline: { start_date: "2026-02-30" } },
    {
      title: "Draft",
      timeline: { start_date: "2026-03-03", end_date: "2026-03-02" },
    },
    {
      title: "Draft",
      timeline: { milestones: [{ label: "Launch", date: "2026-02-30" }] },
    },
    {
      title: "Draft",
      appStoreUrl: "https://apps.apple.com.evil.test/app/id123",
    },
  ])
    assert.equal(draftProjectInputSchema.safeParse(invalid).success, false);
});
test("destination classification and private timeline duration do not invent platform or schedule data", () => {
  assert.equal(
    destinationKind("https://apps.apple.com/us/app/example/id123"),
    "app_store",
  );
  assert.equal(
    destinationKind("https://play.google.com/store/apps/details?id=com.test"),
    "play_store",
  );
  assert.equal(
    destinationKind("https://apps.apple.com.evil.test/app/id123"),
    "web",
  );
  assert.equal(projectDuration(null), null);
  assert.equal(
    projectDuration({ start_date: "2026-01-01", end_date: "2026-02-26" }),
    "8 weeks",
  );
});
for (const role of ["owner", "admin", "editor"] as const)
  test(`${role} can create and edit title-only drafts without publishing`, async () => {
    const api = await fixture(role);
    try {
      assert.equal(
        (
          await api.request(
            "/projects",
            "POST",
            { title: "Title only" },
            undefined,
            "",
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await api.request(
            "/projects",
            "POST",
            { title: "Title only" },
            "https://evil.test",
          )
        ).status,
        403,
      );
      const created = await api.request("/projects", "POST", {
        title: "Title only",
      });
      assert.equal(created.status, 201);
      let { project } = await created.json();
      assert.equal(project.publicationStatus, "draft");
      assert.equal(project.slug, null);
      const list = await (await api.request("/projects")).json();
      assert.equal(list.total, 1);
      assert.ok(!("timeline" in list.projects[0]));
      assert.ok(!("contributors" in list.projects[0]));
      const input = draftProjectInputSchema.parse({
        ...{ title: "More complete" },
        skillIds: [1],
        problem: "**Markdown**",
      });
      const updated = await api.request(`/projects/${project.id}`, "PUT", {
        project: input,
        expectedUpdatedAt: project.updatedAt,
      });
      assert.equal(updated.status, 200);
      const old = project;
      project = (await updated.json()).project;
      assert.deepEqual(project.techStack, ["TypeScript"]);
      assert.equal(
        (
          await api.request(`/projects/${project.id}`, "PUT", {
            project: input,
            expectedUpdatedAt: old.updatedAt,
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await api.request(`/projects/${project.id}/state`, "POST", {
            state: "published",
            expectedUpdatedAt: project.updatedAt,
          })
        ).status,
        role === "editor" ? 403 : 400,
      );
      const publicRows = await (await fetch(api.base + "/api/projects")).json();
      assert.deepEqual(publicRows.projects, []);
    } finally {
      await api.close();
    }
  });
test("quick-create relationships, archive/restore and pagination preserve private drafts", async () => {
  const api = await fixture();
  try {
    const client = await api.request("/clients", "POST", {
      name: "Private company",
      publicName: "Public company",
    });
    assert.equal(client.status, 201);
    const { id: clientId } = await client.json();
    const contributor = await api.request("/contributors", "POST", {
      name: "Builder",
    });
    assert.equal(contributor.status, 201);
    const { id: contributorId } = await contributor.json();
    const created = await api.request("/projects", "POST", {
      title: "Linked",
      clientId,
      contributors: [{ contributorId, role: "Engineer" }],
    });
    assert.equal(created.status, 201);
    let { project } = await created.json();
    for (const bad of [
      "/projects?limit=1000",
      "/projects?offset=-1",
      "/projects?state=anything",
      "/projects?limit=1&limit=2",
    ])
      assert.equal((await api.request(bad)).status, 400);
    const archived = await api.request(
      `/projects/${project.id}/state`,
      "POST",
      { state: "archived", expectedUpdatedAt: project.updatedAt },
    );
    assert.equal(archived.status, 200);
    project = (await archived.json()).project;
    assert.equal(project.publicationStatus, "archived");
    assert.equal(
      (
        await api.request(`/projects/${project.id}`, "PUT", {
          project: draftProjectInputSchema.parse({ title: "No" }),
          expectedUpdatedAt: project.updatedAt,
        })
      ).status,
      409,
    );
    const restored = await api.request(
      `/projects/${project.id}/state`,
      "POST",
      { state: "draft", expectedUpdatedAt: project.updatedAt },
    );
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).project.publicationStatus, "draft");
    assert.ok(api.portfolio.audits.includes("project.archived"));
    assert.ok(api.portfolio.audits.includes("project.restored"));
  } finally {
    await api.close();
  }
});
test("uploads validate the request, clean temporary files, and recheck access after storage", async () => {
  const api = await fixture();
  try {
    const { project } = await (
      await api.request("/projects", "POST", { title: "Media" })
    ).json();
    const url = api.base + `/api/admin/portfolio/projects/${project.id}/media`;
    const headers = { Origin: "http://admin.test", Cookie: api.cookie };
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: { ...headers, "Content-Type": "image/svg+xml" },
          body: "<svg/>",
        })
      ).status,
      415,
    );
    const png = Buffer.alloc(24);
    Buffer.from("89504e470d0a1a0a", "hex").copy(png);
    png.write("IHDR", 12, "ascii");
    const sent = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "image/png" },
      body: png,
    });
    assert.equal(sent.status, 201);
    const uploaded = api.uploaded!;
    await assert.rejects(() => access(uploaded.path));
    const tooLarge = await new Promise<number>((resolve, reject) => {
      const req = httpRequest(
        url,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "video/mp4",
            "Content-Length": String(MAX_PROJECT_VIDEO_BYTES + 1),
          },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode!);
        },
      );
      req.on("error", reject);
      req.end();
    });
    assert.equal(tooLarge, 413);
    api.invalidateUpload();
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: { ...headers, "Content-Type": "image/png" },
          body: png,
        })
      ).status,
      401,
    );
    assert.equal(api.removed, "images/projects/test.png");
  } finally {
    await api.close();
  }
});
test("media inspection requires supported dimensions, a video track and browser-compatible codecs", () => {
  assert.deepEqual(
    validateProbe("video/mp4", {
      streams: [
        { codec_type: "video", codec_name: "h264", width: 1920, height: 1080 },
        { codec_type: "audio", codec_name: "aac" },
      ],
      format: { duration: "10" },
    }),
    { width: 1920, height: 1080 },
  );
  for (const probe of [
    { streams: [] },
    {
      streams: [
        { codec_type: "video", codec_name: "hevc", width: 100, height: 100 },
      ],
      format: { duration: "10" },
    },
    {
      streams: [
        { codec_type: "video", codec_name: "h264", width: 20000, height: 100 },
      ],
      format: { duration: "10" },
    },
    {
      streams: [
        { codec_type: "video", codec_name: "h264", width: 100, height: 100 },
      ],
      format: { duration: "0" },
    },
  ])
    assert.throws(() => validateProbe("video/mp4", probe), HttpError);
});
test("production SQL atomically guards versions, publication state, relationships and audit writes", () => {
  const sql = portfolioSaveSql(false);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /FOR SHARE/);
  assert.match(sql, /auth_version=\$2/);
  assert.match(sql, /publication_status FROM target\)!='draft'/);
  assert.match(sql, /updated_at FROM target\)!=\$5/);
  assert.match(sql, /INSERT INTO project_skills/);
  assert.match(sql, /INSERT INTO project_contributors/);
  assert.match(sql, /INSERT INTO admin_audit_logs/);
  assert.doesNotMatch(sql, /SET publication_status='published'/);
  assert.match(portfolioStateSql, /role IN \('owner','admin'\)/);
});
