import assert from "node:assert/strict";
import test from "node:test";
import { bookingEventPath, bookingUi } from "../lib/booking";
import { site } from "../lib/site";

test("the embedded calendar uses the configured public event, not a hardcoded duplicate", () => {
  assert.equal(bookingEventPath(site.bookingUrl), "promdevs/discovery-call");
  assert.equal(
    bookingEventPath("https://app.cal.com/studio/call/"),
    "studio/call",
  );
  assert.throws(() => bookingEventPath("https://example.com/studio/call"));
  assert.throws(() => bookingEventPath("http://cal.com/studio/call"));
});

test("compact booking focuses on the calendar rather than repeating the event description", () => {
  assert.equal(bookingUi("light", true).hideEventTypeDetails, true);
  assert.equal(bookingUi("dark", true).hideEventTypeDetails, true);
});

test("both calendar themes preserve the booking details and PromDevs accent", () => {
  for (const theme of ["light", "dark"] as const) {
    const config = bookingUi(theme);
    assert.equal(config.theme, theme);
    assert.equal(config.layout, "month_view");
    assert.equal(config.hideEventTypeDetails, false);
    assert.equal(config.cssVarsPerTheme[theme]["cal-brand"], "#2563eb");
  }
});
