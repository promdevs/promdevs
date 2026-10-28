import assert from "node:assert/strict";
import test from "node:test";
import { api, ApiError } from "../src/api";

test("admin requests reject successful HTML and malformed JSON rather than reporting a saved record", async (t) => {
  for (const response of [
    new Response("<html>Proxy fallback</html>"),
    new Response("{broken"),
    Response.json(null),
    Response.json([]),
  ]) {
    const mock = t.mock.method(globalThis, "fetch", async () => response);
    await assert.rejects(
      api("/catalog/clients", { method: "POST", body: "{}" }),
      (error: unknown) => error instanceof ApiError && error.status === 502,
    );
    mock.mock.restore();
  }
});

test("admin requests preserve authorization failures and successful JSON responses", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "Please sign in." }, { status: 401 }),
  );
  await assert.rejects(
    api("/me"),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 401 &&
      error.message === "Please sign in.",
  );
  mock.mock.restore();
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "Saved." }),
  );
  assert.deepEqual(await api("/catalog/clients"), { message: "Saved." });
});
