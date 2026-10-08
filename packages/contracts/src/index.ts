import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);
const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Use an http:// or https:// URL");
const optionalUrl = z
  .union([httpUrl, z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);
const imageUrl = z
  .union([
    httpUrl,
    z
      .string()
      .regex(/^\/(?!\/)[a-zA-Z0-9/_.,@-]+$/)
      .refine((value) => !value.includes(".."), "Invalid image path"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => value || null);

export const contactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("A valid email is required").max(320),
    subject: z.string().trim().min(1, "Subject is required").max(150),
    message: z.string().trim().min(1, "Message is required").max(5000),
    company: z.string().max(200).optional().default(""),
  })
  .strict();
export type ContactInput = z.infer<typeof contactSchema>;

export const projectInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(160),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase words separated by hyphens",
      ),
    description: z.string().trim().min(1, "Description is required").max(2000),
    category: z.string().trim().min(1, "Category is required").max(100),
    techStack: z
      .array(z.string().trim().min(1).max(80))
      .min(1, "Add at least one technology")
      .max(30),
    coverImage: imageUrl,
    liveUrl: optionalUrl,
    githubUrl: optionalUrl,
    featured: z.boolean().default(false),
    status: z.string().trim().min(1).max(80).default("completed"),
    year: z.number().int().min(2000).max(2100),
    problem: optionalText(12000),
    solution: optionalText(12000),
    results: optionalText(12000),
    tags: z
      .array(z.string().trim().min(1).max(80))
      .max(30)
      .nullable()
      .optional()
      .transform((value) => value ?? []),
  })
  .strict();
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectSchema = projectInputSchema.extend({
  id: z.number().int().positive(),
  createdAt: z.string().datetime(),
});
export const projectsResponseSchema = z.object({
  projects: z.array(projectSchema),
});
export const projectResponseSchema = z.object({ project: projectSchema });
export type Project = z.infer<typeof projectSchema>;

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(1024),
  })
  .strict();
export type AdminSession = { email: string };
export const ADMIN_PASSWORD_MIN_LENGTH = 9;

const adminName = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine(
    (value) => !/[\p{Cc}\p{Cf}]/u.test(value),
    "Names must not contain control characters",
  );
const adminRole = z.enum(["owner", "admin", "editor"]);
const adminStatus = z.enum(["invited", "active", "disabled"]);
export const adminAccountSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: adminName,
    role: adminRole,
    status: adminStatus,
    invitationRequired: z.boolean(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    lastLoginAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();
export type AdminAccount = z.infer<typeof adminAccountSchema>;
export const adminAccountUpdateSchema = z
  .object({
    name: adminName.optional(),
    role: adminRole.optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Choose a field to update");
export type AdminAccountUpdate = z.infer<typeof adminAccountUpdateSchema>;
export const adminPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(1024),
    newPassword: z
      .string()
      .min(ADMIN_PASSWORD_MIN_LENGTH)
      .max(1024)
      .refine((value) => !!value.trim(), "Choose a nonblank password"),
    confirmation: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(1024),
  })
  .strict()
  .refine(
    (value) => value.newPassword === value.confirmation,
    "Passwords must match",
  )
  .refine(
    (value) => value.newPassword !== value.currentPassword,
    "Choose a different password",
  );
export type AdminPasswordChange = z.infer<typeof adminPasswordChangeSchema>;
export const adminUsersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();
export const adminUsersResponseSchema = z
  .object({
    users: z.array(adminAccountSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  })
  .strict();
export const adminInviteSchema = z
  .object({
    name: adminName,
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    role: adminRole.default("editor"),
  })
  .strict();
export type AdminInvite = z.infer<typeof adminInviteSchema>;
export const invitationTokenSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const invitationAcceptSchema = invitationTokenSchema
  .extend({
    password: z
      .string()
      .min(ADMIN_PASSWORD_MIN_LENGTH)
      .max(1024)
      .refine((value) => !!value.trim(), "Choose a nonblank password"),
    confirmation: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(1024),
  })
  .refine(
    (value) => value.password === value.confirmation,
    "Passwords must match",
  );
export const adminIdentitySchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: adminRole,
  })
  .strict();
export type AdminIdentity = z.infer<typeof adminIdentitySchema>;

export * from "./portfolio.js";

export * from "./catalog.js";
