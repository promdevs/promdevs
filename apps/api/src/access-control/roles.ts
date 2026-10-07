export const adminRoles = ["owner", "admin", "editor"] as const;
export const adminUserStatuses = ["invited", "active", "disabled"] as const;
export type AdminRole = (typeof adminRoles)[number];
export type AdminUserStatus = (typeof adminUserStatuses)[number];

export const adminPermissions = [
  "content.read",
  "content.create",
  "content.edit_draft",
  "content.edit_published",
  "content.publish",
  "content.delete",
  "media.upload",
  "media.delete",
  "users.read",
  "users.invite",
  "users.edit",
  "users.assign_role",
  "users.deactivate",
  "audit.read",
] as const;
export type AdminPermission = (typeof adminPermissions)[number];

const grants: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  owner: new Set(adminPermissions),
  admin: new Set([
    "content.read",
    "content.create",
    "content.edit_draft",
    "content.edit_published",
    "content.publish",
    "content.delete",
    "media.upload",
    "media.delete",
  ]),
  editor: new Set([
    "content.read",
    "content.create",
    "content.edit_draft",
    "media.upload",
  ]),
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && adminRoles.some((role) => role === value);
}

// Only trust the current role/status loaded by the API from its database.
export function roleHasPermission(role: unknown, permission: unknown): boolean {
  if (!isAdminRole(role) || typeof permission !== "string") return false;
  return grants[role].has(permission as AdminPermission);
}

export function userHasPermission(
  user: { role: unknown; status: unknown } | null | undefined,
  permission: unknown,
): boolean {
  return user?.status === "active" && roleHasPermission(user.role, permission);
}
