export function slugFromName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

export function clientReviewIdentity(client: {
  name: string;
  clientType: "individual" | "organization";
  publicName: string | null;
  contactName: string | null;
  jobTitle: string | null;
  logo: string | null;
}) {
  return {
    authorName:
      client.clientType === "organization"
        ? client.contactName || client.publicName || client.name
        : client.publicName || client.contactName || client.name,
    authorRole: client.jobTitle || "",
    authorCompany:
      client.clientType === "organization"
        ? client.publicName || client.name
        : "",
    authorAvatar: client.logo || "",
  };
}
