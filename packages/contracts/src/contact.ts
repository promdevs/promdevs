import { z } from "zod";

export const CONTACT_ATTACHMENT_BYTES = 3 * 1024 * 1024;
export const CONTACT_ATTACHMENT_COUNT = 3;
// Base64 plus bounded form fields stays below common 4.5 MB hosting limits.
export const CONTACT_BODY_BYTES = 4 * 1024 * 1024 + 64 * 1024;
export const CONTACT_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const contactAttachmentSchema = z
  .object({
    filename: z
      .string()
      .min(1)
      .max(180)
      .regex(/^[^\\/\x00-\x1f\x7f]+$/, "Invalid attachment filename")
      .regex(/\.(pdf|png|jpe?g|webp)$/i, "Use PDF, PNG, JPG or WebP files"),
    contentType: z.enum(CONTACT_ATTACHMENT_TYPES),
    content: z
      .string()
      .min(4)
      .max(4 * Math.ceil(CONTACT_ATTACHMENT_BYTES / 3))
      .regex(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
        "Invalid attachment data",
      ),
  })
  .strict();

export const attachmentByteLength = (content: string) =>
  (content.length * 3) / 4 -
  (content.endsWith("==") ? 2 : content.endsWith("=") ? 1 : 0);

export const contactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("A valid email is required").max(320),
    subject: z.string().trim().min(1, "Subject is required").max(150),
    message: z.string().trim().min(1, "Message is required").max(5000),
    company: z.string().max(200).optional().default(""),
    attachments: z
      .array(contactAttachmentSchema)
      .max(CONTACT_ATTACHMENT_COUNT)
      .optional()
      .default([]),
  })
  .strict()
  .refine(
    (value) =>
      value.attachments.reduce(
        (total, file) => total + attachmentByteLength(file.content),
        0,
      ) <= CONTACT_ATTACHMENT_BYTES,
    "Attachments must total 3 MB or less",
  );
export type ContactInput = z.infer<typeof contactSchema>;
export type ContactAttachment = z.infer<typeof contactAttachmentSchema>;
