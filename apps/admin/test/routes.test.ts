import assert from "node:assert/strict";
import { test } from "node:test";
import { adminRoute } from "../src/routes.js";
import { initialCatalogForm, catalogFields } from "../src/catalog-fields.js";
import { catalogInputs, catalogKinds } from "@promdevs/contracts";
test("admin routes support direct list/create/edit links and reject malformed IDs", () => {
  for (const view of ["projects", ...catalogKinds]) {
    assert.deepEqual(adminRoute("/" + view), { view, selected: null });
    assert.deepEqual(adminRoute("/" + view + "/new"), {
      view,
      selected: "new",
    });
    assert.deepEqual(adminRoute("/" + view + "/42"), { view, selected: "42" });
    for (const suffix of ["/0", "/-1", "/1/x", "/9007199254740992"])
      assert.equal(adminRoute("/" + view + suffix).view, "not-found");
  }
  assert.equal(adminRoute("/security").view, "security");
  assert.equal(adminRoute("/users").view, "users");
  assert.equal(adminRoute("/whatever").view, "not-found");
});
test("review form starts anonymous and accepts incomplete drafts", () => {
  const form = initialCatalogForm("reviews");
  assert.equal(form.showIdentity, false);
  assert.equal(form.clientId, null);
  assert.equal(form.sortOrder, 10);
  assert.equal(catalogInputs.reviews.safeParse(form).success, true);
  assert.ok(catalogFields.clients.some((f) => f.key === "contactEmail"));
});

test("client form exposes an optional job title", () => {
  const field = catalogFields.clients.find((f) => f.key === "jobTitle");
  assert.ok(field);
  assert.equal(field.required, undefined);
  assert.equal(field.max, 160);
  assert.equal(initialCatalogForm("clients").jobTitle, "");
});

test("contributor form exposes optional website and LinkedIn URLs", () => {
  const form = initialCatalogForm("contributors");
  for (const key of ["websiteUrl", "linkedinUrl"]) {
    const field = catalogFields.contributors.find((f) => f.key === key);
    assert.ok(field);
    assert.equal(field.type, "url");
    assert.equal(field.required, undefined);
    assert.equal(form[key], "");
  }
  assert.equal(catalogInputs.contributors.safeParse(form).success, false);
  assert.equal(
    catalogInputs.contributors.safeParse({ ...form, name: "Designer" }).success,
    true,
  );
});
