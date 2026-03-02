import type { Metadata } from "next";
import "./globals.css";
import { Arimo, Rubik } from 'next/font/google'

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



export const metadata: Metadata = {
  metadataBase: new URL("https://promdevs.com"),
  title: "PromDevs \u2014 Coming Soon",
  description:
    "PromDevs is launching soon. We build modern web products and are creating a hiring platform for proven developers.",
  openGraph: {
    title: "PromDevs \u2014 Coming Soon",
    description:
      "PromDevs is launching soon. We build modern web products and are creating a hiring platform for proven developers.",
    images: ["/opengraph-image"],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "PromDevs \u2014 Coming Soon",
    description:
      "PromDevs is launching soon. We build modern web products and are creating a hiring platform for proven developers.",
    images: ["/opengraph-image"]
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${arimo.variable} ${rubik.variable} bg-white text-neutral-900 antialiased transition-colors duration-300 dark:bg-black dark:text-white`}>
        {children}
      </body>
    </html>
  );
}
