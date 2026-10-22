export type BookingTheme = "light" | "dark";

export function bookingEventPath(bookingUrl: string) {
  const url = new URL(bookingUrl);
  if (
    url.protocol !== "https:" ||
    !["cal.com", "app.cal.com"].includes(url.hostname)
  ) {
    throw new Error("Booking must use a public Cal.com event URL.");
  }
  return url.pathname.replace(/^\/+|\/+$/g, "");
}

export function bookingUi(theme: BookingTheme, compact = false) {
  return {
    theme,
    layout: "month_view" as const,
    hideEventTypeDetails: compact,
    cssVarsPerTheme: {
      light: { "cal-brand": "#2563eb", "cal-brand-emphasis": "#1d4ed8" },
      dark: { "cal-brand": "#2563eb", "cal-brand-emphasis": "#1d4ed8" },
    },
  };
}
