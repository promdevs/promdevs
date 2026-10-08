export type AdminRoute = {
  view:
    | "projects"
    | "clients"
    | "reviews"
    | "skills"
    | "contributors"
    | "users"
    | "security"
    | "not-found";
  selected: string | null;
};
export function adminRoute(path: string): AdminRoute {
  const match =
    /^\/(projects|clients|reviews|skills|contributors)(?:\/(new|[1-9]\d*))?\/?$/.exec(
      path,
    );
  if (
    match &&
    (!match[2] || match[2] === "new" || Number.isSafeInteger(Number(match[2])))
  )
    return { view: match[1] as AdminRoute["view"], selected: match[2] ?? null };
  if (/^\/(users|security)\/?$/.test(path))
    return { view: path.split("/")[1] as AdminRoute["view"], selected: null };
  if (path === "/") return { view: "projects", selected: null };
  return { view: "not-found", selected: null };
}
