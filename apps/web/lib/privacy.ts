export type PrivacyChoice = "unknown" | "granted" | "denied";
export const privacyStorageKey = "promdevs.privacy.v1";
export const privacyChoiceLifetime = 180 * 24 * 60 * 60 * 1000;
const changeEvent = "promdevs:privacy-change";
let volatileChoice: PrivacyChoice = "unknown";
let storageUnavailable = false;

export function parsePrivacyChoice(
  raw: string | null,
  now = Date.now(),
): PrivacyChoice {
  try {
    if (!raw) return "unknown";
    const record = JSON.parse(raw);
    if (
      record.version !== 1 ||
      typeof record.analytics !== "boolean" ||
      !Number.isFinite(record.updatedAt) ||
      record.updatedAt > now ||
      now - record.updatedAt >= privacyChoiceLifetime
    )
      return "unknown";
    return record.analytics ? "granted" : "denied";
  } catch {
    return "unknown";
  }
}

export function readPrivacyChoice(): PrivacyChoice {
  if (typeof window === "undefined") return "unknown";
  if (storageUnavailable) return volatileChoice;
  try {
    return parsePrivacyChoice(window.localStorage.getItem(privacyStorageKey));
  } catch {
    return volatileChoice;
  }
}

export function savePrivacyChoice(
  choice: Exclude<PrivacyChoice, "unknown">,
): boolean {
  volatileChoice = choice;
  let persisted = true;
  try {
    window.localStorage.setItem(
      privacyStorageKey,
      JSON.stringify({
        version: 1,
        analytics: choice === "granted",
        updatedAt: Date.now(),
      }),
    );
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
    persisted = false;
  }
  window.dispatchEvent(new Event(changeEvent));
  return persisted;
}

export function subscribePrivacy(notify: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== privacyStorageKey && event.key !== null) return;
    storageUnavailable = false;
    volatileChoice = "unknown";
    notify();
  };
  const visible = () => {
    if (!document.hidden) notify();
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", storage);
  window.addEventListener("focus", notify);
  document.addEventListener("visibilitychange", visible);
  const timer = window.setInterval(notify, 60000);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener("storage", storage);
    window.removeEventListener("focus", notify);
    document.removeEventListener("visibilitychange", visible);
    window.clearInterval(timer);
  };
}

export const privacyServerSnapshot = (): PrivacyChoice => "unknown";
export const privacyOpenEvent = "promdevs:privacy-open";
