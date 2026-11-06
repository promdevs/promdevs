export const portfolioImagePattern = {
  protocol: "https",
  hostname: "media.promdevs.com",
  port: "",
  pathname: "/images/**",
  search: "",
} as const;

export function canOptimizeImage(src: string) {
  if (src.startsWith("//")) return false;
  try {
    const url = new URL(src, "https://local.invalid");
    if (
      url.search ||
      url.hash ||
      !/\.(?:avif|jpe?g|png|webp)$/i.test(url.pathname)
    )
      return false;
    if (src.startsWith("/") && !src.startsWith("//"))
      return /^\/(?:images|assets)\//.test(url.pathname);
    return (
      url.protocol === `${portfolioImagePattern.protocol}:` &&
      url.hostname === portfolioImagePattern.hostname &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith("/images/")
    );
  } catch {
    return false;
  }
}
