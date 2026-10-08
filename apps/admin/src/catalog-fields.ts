import type { AdminIdentity, CatalogKind } from "@promdevs/contracts";
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "url"
    | "textarea"
    | "number"
    | "date"
    | "checkbox"
    | "select";
  required?: boolean;
  max?: number;
  options?: string[];
  help?: string;
  group: string;
};
const field = (
  key: string,
  label: string,
  group: string,
  extra: Partial<Field> = {},
): Field => ({ key, label, group, ...extra });
export const catalogTitles: Record<
  CatalogKind,
  { singular: string; title: string; description: string; note: string }
> = {
  clients: {
    singular: "client",
    title: "Clients",
    description: "Client relationships, contact details, and project history.",
    note: "Contact details and notes are internal. Public identity is controlled on each project and review, not here.",
  },
  reviews: {
    singular: "review",
    title: "Reviews",
    description: "Feedback and testimonials, organized by client and project.",
    note: "Reviews are saved privately as drafts. Identity is hidden by default and independent of a project's Show client setting. Publishing is not enabled yet.",
  },
  skills: {
    singular: "skill",
    title: "Skills",
    description: "Your shared catalog of technologies and product skills.",
    note: "Skills keep their imported IDs. Used skills cannot be renamed or deleted; categories and icons can be updated by owners and admins.",
  },
  contributors: {
    singular: "contributor",
    title: "Contributors",
    description:
      "The people behind your projects, separate from admin accounts.",
    note: "Contributors do not receive sign-in access. Contact details and notes are internal; archiving preserves project relationships.",
  },
};
export const catalogFields: Record<CatalogKind, Field[]> = {
  clients: [
    field("name", "Internal name", "Identity", { required: true }),
    field("clientType", "Client type", "Identity", {
      type: "select",
      options: ["organization", "individual"],
    }),
    field("publicName", "Public display name", "Identity", {
      help: "Optional name to use when a project explicitly shows this client.",
    }),
    field("industry", "Industry", "Identity"),
    field("jobTitle", "Job title", "Identity", {
      max: 160,
      help: "Optional role, such as Founder, CEO, or Product Lead. For an organization, use its contact person's role. Review author roles are managed separately.",
    }),
    field("websiteUrl", "Website URL", "Identity", { type: "url" }),
    field("logo", "Logo URL", "Identity", {
      type: "url",
      help: "Paste a public image URL, or use the image uploader below. Square logos or portraits work best.",
    }),
    field("contactName", "Contact person", "Private contact"),
    field("contactEmail", "Contact email", "Private contact", {
      type: "email",
    }),
    field("contactPhone", "Contact phone", "Private contact"),
    field("notes", "Internal notes", "Private contact", {
      type: "textarea",
      max: 10000,
    }),
  ],
  contributors: [
    field("name", "Name", "Contributor", { required: true }),
    field("websiteUrl", "Website / portfolio URL", "Contributor", {
      type: "url",
      help: "Optional public HTTP(S) URL. Used as the profile link before LinkedIn when both are provided.",
    }),
    field("linkedinUrl", "LinkedIn profile URL", "Contributor", {
      type: "url",
      help: "Optional linkedin.com profile URL. Used when no website is provided.",
    }),
    field("contactEmail", "Contact email", "Contributor", { type: "email" }),
    field("notes", "Internal notes", "Contributor", {
      type: "textarea",
      max: 10000,
    }),
  ],
  skills: [
    field("name", "Name", "Skill", { required: true }),
    field("slug", "Slug", "Skill", {
      required: true,
      help: "Unique lowercase identifier, such as react-native. Names and slugs of used skills are protected.",
    }),
    field("category", "Category", "Skill", {
      required: true,
      help: "Use your existing catalog categories for consistency.",
    }),
    field("iconUrl", "Icon URL", "Skill", {
      type: "url",
      help: "Paste a public image URL, or upload an icon below. Existing imported icons are retained.",
    }),
  ],
  reviews: [
    field("title", "Review title (optional)", "Feedback", {
      help: "Leave blank if you prefer. A title is not required to save a review.",
    }),
    field("body", "Review text", "Feedback", {
      type: "textarea",
      max: 16000,
      help: "Plain text, quoted as supplied by the client. A draft can be incomplete.",
    }),
    field("rating", "Rating (1–5)", "Feedback", {
      type: "number",
      help: "Optional. Up to two decimal places, e.g. 4.99.",
    }),
    field("reviewedAt", "Review date", "Feedback", { type: "date" }),
    field("authorName", "Author name", "Identity", {
      help: "Required only when showing identity. Enter it yourself or explicitly fill from the client, then review before publishing.",
    }),
    field("authorRole", "Author role", "Identity"),
    field("authorCompany", "Author company", "Identity"),
    field("authorAvatar", "Author avatar URL", "Identity", { type: "url" }),
    field("showIdentity", "Show author identity when published", "Identity", {
      type: "checkbox",
      help: "Off means anonymous attribution. It does not publish the review.",
    }),
    field("source", "Source", "Source & placement", {
      required: true,
      help: "Lowercase slug: direct, google, contra, etc.",
    }),
    field("sourceUrl", "Original review URL", "Source & placement", {
      type: "url",
    }),
    field("externalId", "External review ID", "Source & placement", {
      help: "Optional. Unique together with the source to prevent duplicates.",
    }),
    field("featured", "Featured review", "Source & placement", {
      type: "checkbox",
    }),
    field("sortOrder", "Display order", "Source & placement", {
      type: "number",
      help: "Lower numbers appear first when publishing is enabled.",
    }),
    field("internalNotes", "Internal notes", "Source & placement", {
      type: "textarea",
      max: 10000,
    }),
  ],
};
export type CatalogForm = Record<string, string | number | boolean | null>;
export function initialCatalogForm(kind: CatalogKind): CatalogForm {
  const form = Object.fromEntries(
    catalogFields[kind].map((f) => [f.key, f.type === "checkbox" ? false : ""]),
  );
  if (kind === "clients") form.clientType = "organization";
  if (kind === "reviews")
    Object.assign(form, {
      clientId: null,
      projectId: null,
      source: "direct",
      sortOrder: 0,
      rating: null,
      reviewedAt: null,
    });
  return form;
}

export type CatalogPageProps = {
  kind: CatalogKind;
  identity: AdminIdentity;
  onExpired: (notice?: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onNavigate: (path: string, replace?: boolean) => void;
};
