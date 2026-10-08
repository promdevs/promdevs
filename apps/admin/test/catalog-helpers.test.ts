import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clientReviewIdentity,
  slugFromName,
} from "../src/catalog-field-helpers.js";
import { catalogFields } from "../src/catalog-fields.js";
import { mediaGuidance } from "../src/project-field-helpers.js";

test("slug generation normalizes names, punctuation, accents and length without random suffixes", () => {
  assert.equal(slugFromName("  Café / Web Apps  "), "cafe-web-apps");
  assert.equal(slugFromName("React Native + AI"), "react-native-ai");
  assert.equal(slugFromName("---"), "");
  assert.ok(slugFromName("a ".repeat(200)).length <= 160);
  assert.ok(!slugFromName("a ".repeat(200)).endsWith("-"));
});

test("review autofill explicitly copies only author fields, never visibility or private contact data", () => {
  const client = {
    name: "Internal company",
    clientType: "organization" as const,
    publicName: "Public company",
    contactName: "Jane Doe",
    jobTitle: "Founder",
    logo: "https://media.example.test/client.png",
    contactEmail: "private@example.test",
    contactPhone: "private",
  };
  const result = clientReviewIdentity(client);
  assert.deepEqual(result, {
    authorName: "Jane Doe",
    authorRole: "Founder",
    authorCompany: "Public company",
    authorAvatar: client.logo,
  });
  assert.ok(!("showIdentity" in result));
  assert.ok(!("contactEmail" in result));
  assert.equal(
    clientReviewIdentity({
      ...client,
      clientType: "individual",
      publicName: "Jane",
      contactName: null,
    }).authorName,
    "Jane",
  );
  assert.equal(
    clientReviewIdentity({ ...client, clientType: "individual" }).authorCompany,
    "",
  );
});

test("review titles remain optional and client/skill uploads give square image guidance", () => {
  assert.equal(
    catalogFields.reviews.find((f) => f.key === "title")?.required,
    undefined,
  );
  assert.match(
    catalogFields.reviews.find((f) => f.key === "title")!.label,
    /optional/,
  );
  for (const guide of [mediaGuidance.client, mediaGuidance.skill]) {
    assert.match(guide.recommendation, /1:1/);
    assert.match(guide.formats, /10 MiB/);
    assert.ok(!guide.accept.includes("svg"));
  }
});
