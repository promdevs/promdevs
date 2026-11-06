import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  analyticsCookieDomains,
  analyticsId,
  analyticsPage,
  createAnalyticsController,
} from "../lib/analytics";
import {
  parsePrivacyChoice,
  privacyChoiceLifetime,
  privacyStorageKey,
  type PrivacyChoice,
} from "../lib/privacy";
import { site } from "../lib/site";

function harness(initial: PrivacyChoice = "unknown") {
  let consent = initial;
  const calls: unknown[][] = [];
  const controller = createAnalyticsController({
    consent: () => consent,
    command: (...args) => calls.push(args),
    load: () => calls.push(["load"]),
    disable: (value) => calls.push(["disable", value]),
    clearCookies: () => calls.push(["clearCookies"]),
    clearPending: () => calls.push(["clearPending"]),
  });
  return {
    controller,
    calls,
    setConsent: (value: PrivacyChoice) => {
      consent = value;
    },
  };
}
const eventCalls = (calls: unknown[][], name: string) =>
  calls.filter((row) => row[0] === "event" && row[1] === name);
const booked = (
  uid = "private-booking-123",
  overrides = {},
  type = "bookingSuccessfulV2",
) => ({
  detail: {
    type,
    data: {
      uid,
      status: "ACCEPTED",
      paymentRequired: false,
      title: "Private name",
      email: "private@example.test",
      videoCallUrl: "https://private.example.test/secret",
      ...overrides,
    },
  },
});

test("privacy preferences require a current, valid, explicit choice and expire after 180 days", () => {
  const now = 1800000000000;
  const record = (analytics: boolean, updatedAt = now) =>
    JSON.stringify({ version: 1, analytics, updatedAt });
  assert.equal(parsePrivacyChoice(record(true), now), "granted");
  assert.equal(parsePrivacyChoice(record(false), now), "denied");
  assert.equal(
    parsePrivacyChoice(record(true, now - privacyChoiceLifetime + 1), now),
    "granted",
  );
  for (const raw of [
    null,
    "",
    "null",
    "true",
    "{broken",
    record(true, now + 1),
    record(true, now - privacyChoiceLifetime),
    JSON.stringify({ version: 2, analytics: true, updatedAt: now }),
    JSON.stringify({ version: 1, analytics: "true", updatedAt: now }),
    JSON.stringify({ version: 1, analytics: true, updatedAt: "yesterday" }),
  ]) {
    assert.equal(parsePrivacyChoice(raw, now), "unknown");
  }
  assert.equal(privacyStorageKey, "promdevs.privacy.v1");
});

test("unknown or refused analytics never loads the SDK, sends events or buffers an enquiry", () => {
  for (const choice of ["unknown", "denied"] as const) {
    const { controller, calls, setConsent } = harness(choice);
    controller.sync();
    assert.equal(controller.view("/services"), false);
    assert.equal(controller.lead("contact_form"), false);
    assert.equal(controller.booking(booked()), false);
    assert.deepEqual(calls, [
      ["disable", true],
      ["clearPending"],
      ["clearCookies"],
    ]);
    setConsent("granted");
    controller.sync();
    assert.equal(eventCalls(calls, "generate_lead").length, 0);
    assert.equal(controller.booking(booked()), false);
  }
});

test("opt-in initializes once with advertising denied and explicit, sanitised page views", () => {
  assert.equal(analyticsId, "G-L0FJ2JDD88");
  const { controller, calls } = harness("granted");
  controller.sync();
  controller.sync();
  assert.equal(calls.filter((row) => row[0] === "load").length, 1);
  assert.deepEqual(calls[0], ["disable", false]);
  const update = calls.find(
    (row) => row[0] === "consent" && row[1] === "update",
  )!;
  assert.deepEqual(update[2], {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  const config = calls.find((row) => row[0] === "config")!;
  assert.equal(config[1], analyticsId);
  assert.equal(
    (config[2] as { send_page_view: boolean }).send_page_view,
    false,
  );
  assert.equal(
    (config[2] as { allow_google_signals: boolean }).allow_google_signals,
    false,
  );
  assert.equal(controller.view("/services"), true);
  assert.equal(controller.view("/services"), false);
  assert.equal(controller.view("/projects/first-product"), true);
  assert.equal(controller.view("/projects/another-product"), true);
  assert.equal(eventCalls(calls, "page_view").length, 3);
});

test("withdrawal disables collection before consent updates and clears pending events; opt-in cannot replay old enquiries", () => {
  const { controller, calls, setConsent } = harness("granted");
  controller.sync();
  controller.view("/services");
  controller.lead("contact_form");
  const start = calls.length;
  setConsent("denied");
  controller.sync();
  assert.deepEqual(
    calls.slice(start).map((row) => row[0]),
    ["disable", "consent", "clearPending", "clearCookies"],
  );
  assert.deepEqual(calls[start], ["disable", true]);
  assert.equal(controller.lead("contact_form"), false);
  assert.equal(controller.view("/about"), false);
  setConsent("granted");
  controller.sync();
  assert.equal(eventCalls(calls, "generate_lead").length, 1);
  assert.equal(controller.view("/services"), true);
  assert.equal(eventCalls(calls, "page_view").length, 2);
  setConsent("unknown");
  assert.equal(controller.lead("contact_form"), false);
});

test("enquiry events accept only known channels and contain no free-text or booking data", () => {
  const { controller, calls } = harness("granted");
  controller.sync();
  controller.view("/?name=Moses&email=private@example.test#private");
  controller.lead("contact_form");
  assert.equal(controller.booking(booked()), true);
  assert.equal(controller.booking(booked()), false);
  assert.equal(
    controller.lead("private@example.test" as "contact_form"),
    false,
  );
  const events = eventCalls(calls, "generate_lead");
  assert.deepEqual(
    events.map((row) => row[2]),
    [
      { lead_method: "contact_form", ...analyticsPage("/") },
      { lead_method: "discovery_call", ...analyticsPage("/") },
    ],
  );
  assert.ok(!JSON.stringify(events).includes("private"));
  assert.ok(!JSON.stringify(events).includes("Moses"));
  assert.ok(!JSON.stringify(events).includes("booking-123"));
});

test("bookings count only accepted, paid-or-free fresh bookings, never pending, rescheduled, cancelled or dry runs", () => {
  const { controller, calls } = harness("granted");
  controller.sync();
  for (const event of [
    null,
    {},
    { detail: null },
    booked("pending", { status: "PENDING" }),
    booked("cancelled", { status: "CANCELLED" }),
    booked("unpaid", { paymentRequired: true }),
    booked("", {}),
    booked("rescheduled", {}, "rescheduleBookingSuccessfulV2"),
    booked("test", {}, "dryRunBookingSuccessfulV2"),
  ]) {
    assert.equal(controller.booking(event), false);
  }
  assert.equal(eventCalls(calls, "generate_lead").length, 0);
});

test("page context rejects arbitrary routes and excludes query strings, hashes, titles and referrers", () => {
  for (const input of [
    "/services?email=private@example.test#name",
    "/projects/known-product?private=123",
    "/private@example.test",
    "/projects/private%40example.test",
    "/constructor",
    "/__proto__",
  ]) {
    const page = analyticsPage(input);
    assert.ok(!JSON.stringify(page).includes("private"));
    assert.ok(!JSON.stringify(page).includes("?"));
    assert.ok(!JSON.stringify(page).includes("#"));
    assert.equal(page.page_referrer, "");
  }
  assert.equal(
    analyticsPage("/projects/a-product").page_path,
    "/projects/detail",
  );
  assert.equal(
    analyticsPage("/expertise/replit").page_path,
    "/expertise/replit",
  );
  assert.ok(
    analyticsCookieDomains("www.promdevs.com").includes(".promdevs.com"),
  );
  assert.ok(!analyticsCookieDomains("www.promdevs.com").includes(".com"));
});

test("contact, privacy links and consent-gated runtime replace ungated tracking without changing API delivery settings", async () => {
  assert.equal(site.contactEmail, "info@promdevs.com");
  const read = (path: string) =>
    readFile(new URL(path, import.meta.url), "utf8");
  const [layout, footer, form, calendar, ui, analytics] = await Promise.all([
    read("../app/layout.tsx"),
    read("../components/Footer.tsx"),
    read("../components/sections/Contact.tsx"),
    read("../components/booking/BookingCalendar.tsx"),
    read("../components/PrivacyChoices.tsx"),
    read("../lib/analytics.ts"),
  ]);
  assert.ok(!layout.includes("GoogleAnalytics"));
  assert.ok(layout.includes("<PrivacyChoices />"));
  assert.ok(footer.includes("PrivacySettingsButton"));
  for (const source of [footer, form])
    assert.ok(source.includes("mailto:${site.contactEmail}"));
  assert.ok(form.includes('href="/privacy-policy"'));
  assert.ok(
    form.indexOf('trackEnquiry("contact_form")') >
      form.indexOf("if (!response.ok)"),
  );
  assert.ok(!form.includes('receipt === "sent"'));
  assert.ok(
    calendar.includes('action: "bookingSuccessfulV2", callback: booked'),
  );
  assert.ok(calendar.includes('cal("off", { action: "bookingSuccessfulV2"'));
  assert.ok(ui.includes("showModal()"));
  assert.ok(ui.includes("onClose="));
  assert.ok(ui.includes("className={styles.clearance}"));
  assert.ok(analytics.includes("ga-disable-${analyticsId}"));
  assert.ok(!analytics.includes("document.referrer"));
  assert.ok(!analytics.includes("document.title"));
});
