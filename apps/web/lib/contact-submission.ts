export type ContactReceipt = "sent" | "invalid" | "limited" | "unavailable";

export function contactReceipt(value: unknown): ContactReceipt | undefined {
  return typeof value === "string" &&
    ["sent", "invalid", "limited", "unavailable"].includes(value)
    ? (value as ContactReceipt)
    : undefined;
}

export function contactNotice(receipt?: ContactReceipt): {
  status: "idle" | "success" | "error";
  message: string;
} {
  if (!receipt) return { status: "idle", message: "" };
  const messages = {
    sent: "Thanks, your message has been sent.",
    invalid:
      "Your message was not sent. Please complete all required fields with valid details.",
    limited:
      "Your message was not sent. Please wait a few minutes before trying again.",
    unavailable:
      "Your message was not sent. Please try again shortly, or book a call.",
  };
  return {
    status: receipt === "sent" ? "success" : "error",
    message: messages[receipt],
  };
}
