import { readPrivacyChoice, type PrivacyChoice } from "./privacy";
import { site } from "./site";

export const analyticsId = "G-L0FJ2JDD88";
export type EnquiryMethod = "contact_form" | "discovery_call";
type Transport = {
  consent: () => PrivacyChoice;
  command: (...args: unknown[]) => void;
  load: () => void;
  disable: (disabled: boolean) => void;
  clearCookies: () => void;
  clearPending: () => void;
};
const deniedConsent = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

export function analyticsPage(pathname: string) {
  const clean = pathname.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
  const staticPages: Record<string, string> = {
    "/": "Home",
    "/services": "Services",
    "/projects": "Our work",
    "/about": "About",
    "/client-stories": "Client stories",
    "/privacy-policy": "Privacy policy",
    "/terms-of-service": "Terms of service",
    "/expertise/replit": "Replit expertise",
    "/expertise/lovable": "Lovable expertise",
    "/expertise/base44": "Base44 expertise",
  };
  // Group detail views; never send arbitrary paths, queries, hashes or referrers.
  const path = Object.hasOwn(staticPages, clean)
    ? clean
    : /^\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)
      ? "/projects/detail"
      : "/not-found";
  return {
    page_location: `${site.url}${path}`,
    page_path: path,
    page_title: `${staticPages[path] ?? (path === "/projects/detail" ? "Project details" : "Page not found")} | PromDevs`,
    page_referrer: "",
  };
}

export function createAnalyticsController(transport: Transport) {
  let active = false;
  let lastPage: ReturnType<typeof analyticsPage> | null = null;
  let lastViewKey: string | null = null;
  const bookings = new Set<string>();
  const allowed = () => active && transport.consent() === "granted";
  const sync = () => {
    if (transport.consent() !== "granted") {
      transport.disable(true);
      if (active) transport.command("consent", "update", deniedConsent);
      transport.clearPending();
      transport.clearCookies();
      active = false;
      lastPage = null;
      lastViewKey = null;
      return;
    }
    if (active) return;
    transport.disable(false);
    transport.command("consent", "default", deniedConsent);
    transport.command("consent", "update", {
      ...deniedConsent,
      analytics_storage: "granted",
    });
    transport.command("js", new Date());
    transport.command("config", analyticsId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 15552000,
      ...analyticsPage("/"),
    });
    active = true;
    transport.load();
  };
  const view = (pathname: string) => {
    if (!allowed()) return false;
    const page = analyticsPage(pathname);
    if (lastViewKey === pathname) return false;
    lastViewKey = pathname;
    lastPage = page;
    transport.command("set", page);
    transport.command("event", "page_view", page);
    return true;
  };
  const lead = (method: EnquiryMethod) => {
    if (!allowed() || !["contact_form", "discovery_call"].includes(method))
      return false;
    transport.command("event", "generate_lead", {
      lead_method: method,
      ...(lastPage ?? analyticsPage("/")),
    });
    return true;
  };
  const booking = (event: unknown) => {
    if (!event || typeof event !== "object" || !("detail" in event))
      return false;
    const detail = event.detail as
      | {
          type?: string;
          data?: { uid?: unknown; status?: unknown; paymentRequired?: unknown };
        }
      | undefined;
    const data = detail?.data;
    if (
      detail?.type !== "bookingSuccessfulV2" ||
      !data ||
      data.status !== "ACCEPTED" ||
      data.paymentRequired !== false ||
      typeof data.uid !== "string" ||
      !/^[\w-]{1,128}$/.test(data.uid) ||
      bookings.has(data.uid)
    )
      return false;
    // IDs are kept only in bounded tab memory for deduplication, never sent to GA.
    bookings.add(data.uid);
    if (bookings.size > 100) bookings.delete(bookings.values().next().value!);
    return lead("discovery_call");
  };
  return { sync, view, lead, booking };
}

export function analyticsCookieDomains(hostname: string) {
  const parts = hostname.split(".");
  const domains = new Set(["", hostname, `.${hostname}`]);
  for (let index = 1; index < parts.length - 1; index++)
    domains.add(`.${parts.slice(index).join(".")}`);
  return [...domains];
}

function clearAnalyticsCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=", 1)[0].trim();
    if (!/^(_ga(?:_.*)?|_gid|_gat(?:_.*)?)$/.test(name)) continue;
    for (const domain of analyticsCookieDomains(location.hostname)) {
      document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ""} SameSite=Lax`;
    }
  }
}

type AnalyticsWindow = Window &
  Partial<Record<`ga-disable-${typeof analyticsId}`, boolean>> & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
let controller: ReturnType<typeof createAnalyticsController> | undefined;
function browserController() {
  if (typeof window === "undefined") return undefined;
  if (controller) return controller;
  const target = window as AnalyticsWindow;
  controller = createAnalyticsController({
    consent: readPrivacyChoice,
    disable: (disabled) => {
      target[`ga-disable-${analyticsId}`] = disabled;
    },
    command: (...args) => {
      target.dataLayer ??= [];
      target.gtag ??= function () {
        // Preserve Google's Arguments-based command queue protocol.
        // eslint-disable-next-line prefer-rest-params
        target.dataLayer!.push(arguments);
      };
      target.gtag(...args);
    },
    load: () => {
      if (document.getElementById("promdevs-analytics")) return;
      const script = document.createElement("script");
      script.id = "promdevs-analytics";
      script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`;
      script.async = true;
      script.addEventListener("load", () => {
        script.dataset.ready = "true";
      });
      script.addEventListener("error", () => {
        script.remove();
      });
      document.head.appendChild(script);
    },
    clearCookies: clearAnalyticsCookies,
    clearPending: () => {
      if (
        document.getElementById("promdevs-analytics")?.dataset.ready !==
          "true" &&
        target.dataLayer
      )
        target.dataLayer.length = 0;
    },
  });
  return controller;
}

// Analytics is optional: failures must never interrupt the enquiry or booking UI.
export function syncAnalytics() {
  try {
    browserController()?.sync();
  } catch {}
}
export function trackPageView(pathname: string) {
  try {
    browserController()?.view(pathname);
  } catch {}
}
export function trackEnquiry(method: EnquiryMethod) {
  try {
    browserController()?.lead(method);
  } catch {}
}
export function trackConfirmedBooking(event: unknown) {
  try {
    browserController()?.booking(event);
  } catch {}
}
