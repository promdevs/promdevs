import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { ActionLink } from "@/components/Action";
import { MotionReveal } from "@/components/MotionReveal";
import { site } from "@/lib/site";
import styles from "./Footer.module.css";

type FooterItem = { label: string; href?: string; external?: boolean };

const groups: { title: string; items: FooterItem[] }[] = [
  {
    title: "Studio",
    items: [
      { label: "About us", href: "/#about" },
      { label: "Our work", href: "/projects" },
      { label: "Client stories" },
      { label: "Journal" },
      { label: "Careers" },
    ],
  },
  {
    title: "Capabilities",
    items: [
      { label: "Product design & engineering", href: "/#services" },
      { label: "Web, mobile & AI products", href: "/#services" },
      { label: "Prototype to production", href: "/#services" },
      { label: "Product rescue & migrations", href: "/#services" },
      { label: "Quality & launch", href: "/#services" },
    ],
  },
  {
    title: "Expertise",
    items: [
      { label: "Lovable", href: "/#contact" },
      { label: "Replit", href: "/#contact" },
      { label: "Base44", href: "/#contact" },
      { label: "AI-assisted builds", href: "/#services" },
    ],
  },
  {
    title: "Connect",
    items: [
      { label: "Let's talk", href: "/#contact" },
      ...site.socials.map((social) => ({
        label: social.label,
        href: social.url,
        external: true,
      })),
    ],
  },
];

function FooterDestination({ item }: { item: FooterItem }) {
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

  return item.external ? (
    <a href={item.href} className={styles.link}>
      {content}
    </a>
  ) : (
    <Link href={item.href} className={styles.link}>
      {content}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="shell">
        <MotionReveal className={styles.invitation}>
          <div>
            <p className="eyebrow">Your next chapter</p>
            <h2 className={styles.headline}>
              Good things start
              <br />
              with a <em>conversation.</em>
            </h2>
            <p className={styles.invitationCopy}>
              A rough idea. A product to improve. Let&apos;s find your next
              step.
            </p>
          </div>
          <ActionLink href="/#contact" label="Let's talk" />
        </MotionReveal>

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
              An independent digital product studio. Design-led.
              Engineering-minded. With you from idea to launch.
            </p>
          </MotionReveal>
          {groups.map((group, index) => (
            <MotionReveal key={group.title} delayMs={index * 60}>
              <nav aria-label={`Footer ${group.title}`}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                <ul className={styles.list} role="list">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <FooterDestination item={item} />
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
            <FooterDestination item={{ label: "Privacy policy" }} />
            <FooterDestination item={{ label: "Terms of service" }} />
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
