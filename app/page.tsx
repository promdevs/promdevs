import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { site } from "@/lib/site";
export const metadata: Metadata = { alternates: { canonical: "/" } };
export default function HomePage() {
  return (
    <>
      <Header />
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
        <Services />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
