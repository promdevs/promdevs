import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { AITools } from "@/components/sections/AITools";
import { Services } from "@/components/sections/Services";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { FAQs } from "@/components/sections/FAQs";
import { site } from "@/lib/site";
import { Suspense } from "react";
import { Projects } from "@/components/sections/Projects";
import { Reviews } from "@/components/sections/Reviews";
export const metadata: Metadata = { alternates: { canonical: "/" } };
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const htmlOnly = (await searchParams).view === "html";
  // React's streaming reveal scripts cannot run with JS disabled. The same canonical
  // page can deliver a complete HTML document instead of hiding streamed sections.
  const [work, stories] = htmlOnly
    ? await Promise.all([Projects(), Reviews()])
    : [null, null];
  return (
    <>
      <Header homePath={htmlOnly ? "/?view=html" : "/"} />
      {!htmlOnly && (
        <noscript>
          <meta httpEquiv="refresh" content="0;url=/?view=html" />
        </noscript>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${site.url}/#organization`,
                name: site.name,
                url: site.url,
                description: site.description,
                logo: `${site.url}/images/nobg-logo-black.png`,
                sameAs: site.socials.map((social) => social.url),
              },
              {
                "@type": "WebSite",
                "@id": `${site.url}/#website`,
                name: site.name,
                url: site.url,
                publisher: { "@id": `${site.url}/#organization` },
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <main id="main-content">
        <Hero />
        <AITools />
        <Services />
        {htmlOnly ? (
          <>
            {work}
            {stories}
          </>
        ) : (
          <>
            <Suspense fallback={null}>
              <Projects />
            </Suspense>
            <Suspense fallback={null}>
              <Reviews />
            </Suspense>
          </>
        )}
        <About />
        <FAQs />
        <Contact />
      </main>
      <Footer homePath={htmlOnly ? "/?view=html" : "/"} />
    </>
  );
}
