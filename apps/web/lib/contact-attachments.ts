import {
  CONTACT_ATTACHMENT_BYTES,
  CONTACT_ATTACHMENT_COUNT,
  CONTACT_ATTACHMENT_TYPES,
  type ContactAttachment,
} from "@promdevs/contracts";

export function attachmentSelectionError(files: File[]): string | null {
  if (files.length > CONTACT_ATTACHMENT_COUNT) return "Choose up to 3 files.";
  if (
    files.some(
      (file) =>
        !file.size ||
        file.name.length > 180 ||
        !/\.(pdf|png|jpe?g|webp)$/i.test(file.name) ||
        !(CONTACT_ATTACHMENT_TYPES as readonly string[]).includes(file.type),
    )
  )
    return "Choose non-empty PDF, PNG, JPG or WebP files.";
  if (
    files.reduce((total, file) => total + file.size, 0) >
    CONTACT_ATTACHMENT_BYTES
  )
    return "Attachments must total 3 MB or less.";
  return null;
}

export async function encodeContactAttachments(
  files: File[],
): Promise<ContactAttachment[]> {
  const error = attachmentSelectionError(files);
  if (error) throw new Error(error);
  return Promise.all(
    files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000)
        binary += String.fromCharCode(
          ...bytes.subarray(offset, offset + 0x8000),
        );
      return {
        filename: file.name,
        contentType: file.type as ContactAttachment["contentType"],
        content: btoa(binary),
      };
    }),
  );
}
