import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: "%s | PromDevs",
  },
  description: site.description,
  openGraph: {
    title: site.socialTitle,
    description: site.description,
    type: "website",
    siteName: "PromDevs",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: site.socialTitle,
    description: site.description,
  },
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
        <GoogleAnalytics gaId="G-1Z9KZ5VZ8C" />
      </body>
    </html>
  );
}
