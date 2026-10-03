import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MotionReveal } from "@/components/MotionReveal";
import { site } from "@/lib/site";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <MotionReveal className="footer-top">
          <p>Independent minds. Shared ambition.</p>
          <div className="socials">
            {site.socials.map((social) => (
              <a key={social.url} href={social.url}>
                {social.label}
              </a>
            ))}
          </div>
        </MotionReveal>
        <MotionReveal>
          <div className="footer-wordmark" aria-hidden="true">
            promdevs<span className="text-accent">.</span>
          </div>
        </MotionReveal>
        <MotionReveal className="footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} PromDevs. All rights reserved.
          </p>
          <Link
            href="/#contact"
            className="footer-contact inline-flex items-center gap-2"
          >
            Good things start with a conversation{" "}
            <ArrowUpRight size={14} aria-hidden />
          </Link>
        </MotionReveal>
      </div>
    </footer>
  );
}
