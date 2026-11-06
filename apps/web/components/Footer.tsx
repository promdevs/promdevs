import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { MotionReveal } from "@/components/MotionReveal";
import { site } from "@/lib/site";
import { expertiseNavigation } from "@/data/expertise-navigation";
import { serviceAreas } from "@/data/services";
import { PrivacySettingsButton } from "./PrivacyChoices";
import styles from "./Footer.module.css";

type FooterItem = { label: string; href?: string; external?: boolean };

const groups: { title: string; items: FooterItem[] }[] = [
  {
    title: "Studio",
    items: [
      { label: "About us", href: "/about" },
      { label: "Our work", href: "/projects" },
      { label: "Client stories", href: "/client-stories" },
      { label: "FAQs", href: "/#faqs" },
      { label: "Journal" },
      { label: "Careers" },
    ],
  },
  {
    title: "Capabilities",
    items: serviceAreas.map(({ id, name }) => ({
      label: name,
      href: `/services#${id}`,
    })),
  },
  {
    title: "Expertise",
    items: [
      ...expertiseNavigation.map(({ name, href }) => ({ label: name, href })),
      {
        label: "AI-assisted builds",
        href: "/services#prototype-to-production",
      },
    ],
  },
  {
    title: "Connect",
    items: [
      { label: "Let's talk", href: "/#contact" },
      { label: site.contactEmail, href: `mailto:${site.contactEmail}` },
      ...site.socials.map((social) => ({
        label: social.label,
        href: social.url,
        external: true,
      })),
    ],
  },
];

function FooterDestination({
  item,
  homePath = "/",
}: {
  item: FooterItem;
  homePath?: string;
}) {
  if (!item.href) {
    return (
      <span className={styles.unavailable} aria-disabled="true">
        <span>{item.label}</span>
        <small>Coming soon</small>
      </span>
    );
  }

  const content = (
    <>
      <span>{item.label}</span>
      {item.external && <ArrowUpRight size={13} aria-hidden="true" />}
    </>
  );

  const isSection = item.href.startsWith("/#");
  const href = isSection ? `${homePath}${item.href.slice(1)}` : item.href;

  return item.external || isSection || href.startsWith("mailto:") ? (
    <a href={href} className={styles.link}>
      {content}
    </a>
  ) : (
    <Link href={href} className={styles.link}>
      {content}
    </Link>
  );
}

export function Footer({ homePath = "/" }: { homePath?: string } = {}) {
  return (
    <footer className={styles.footer}>
      <div className="shell">
        <div className={styles.directory}>
          <MotionReveal className={styles.identity}>
            <Link href="/" className="brand" aria-label="PromDevs home">
              <Image
                src="/images/nobg-logo-black.png"
                width={40}
                height={40}
                alt=""
                className="dark:hidden"
              />
              <Image
                src="/images/nobg-logo-white.png"
                width={40}
                height={40}
                alt=""
                className="hidden dark:block"
              />
              <span>
                <span className="text-black dark:text-white">prom</span>
                <span className="text-accent">devs</span>
              </span>
            </Link>
            <p>
              A digital product studio. Design-led. Engineering-minded. With you
              from idea to launch.
            </p>
          </MotionReveal>
          {groups.map((group, index) => (
            <MotionReveal key={group.title} delayMs={index * 60}>
              <nav aria-label={`Footer ${group.title}`}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                <ul className={styles.list} role="list">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <FooterDestination item={item} homePath={homePath} />
                    </li>
                  ))}
                </ul>
              </nav>
            </MotionReveal>
          ))}
        </div>

        <MotionReveal className={styles.bottom}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} PromDevs. All rights reserved.
          </p>
          <div className={styles.legal}>
            <PrivacySettingsButton className={styles.link} />
            <FooterDestination
              item={{ label: "Privacy policy", href: "/privacy-policy" }}
            />
            <FooterDestination
              item={{ label: "Terms of service", href: "/terms-of-service" }}
            />
          </div>
          <a href="#main-content" className={styles.link}>
            <span>Back to top</span>
            <ArrowUp size={14} aria-hidden="true" />
          </a>
        </MotionReveal>
      </div>
    </footer>
  );
}
