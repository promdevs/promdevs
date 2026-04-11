import type { Metadata } from "next";
import "./globals.css";
import { Arimo, Rubik, MuseoModerno } from 'next/font/google'
import { GoogleTagManager } from '@next/third-parties/google'


const arimo = Arimo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arimo'
});

const rubik = Rubik({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rubik'
});

const museoModerno = MuseoModerno({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-museo-moderno'
});



export const metadata: Metadata = {
  metadataBase: new URL("https://www.promdevs.com"),
  title: "PromDevs \u2014 Build & Hire Developers",
  description:
    "PromDevs helps startups and businesses build products, hire developers, and showcase technical talent.",
  openGraph: {
    title: "PromDevs \u2014 Build & Hire Developers",
    description:
      "PromDevs helps startups and businesses build products, hire developers, and showcase technical talent.",
    type: "website",
    siteName: "PromDevs",
    url: "https://www.promdevs.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromDevs \u2014 Build & Hire Developers",
    description:
      "PromDevs helps startups and businesses build products, hire developers, and showcase technical talent.",
  }
};

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", useDark);
  } catch (_) {}
})();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <GoogleTagManager gtmId="G-L0FJ2JDD88" />
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${arimo.variable} ${rubik.variable} ${museoModerno.variable} bg-white text-neutral-900 antialiased transition-colors duration-300 dark:bg-black dark:text-white`}>
        {children}
      </body>
    </html>
  );
}
