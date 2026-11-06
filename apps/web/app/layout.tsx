import type { Metadata } from "next";
import { PrivacyChoices } from "@/components/PrivacyChoices";
import "./globals.css";
import { site } from "@/lib/site";
import { socialMetadata } from "@/lib/seo";
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: "%s | PromDevs",
  },
  description: site.description,
  ...socialMetadata({
    title: site.socialTitle,
    description: site.description,
    path: "/",
  }),
};
const themeInit = `(() => { let theme; try { theme = localStorage.getItem("theme"); } catch {} const dark = theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.classList.toggle("dark", dark); })();`;
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <PrivacyChoices />
      </body>
    </html>
  );
}
