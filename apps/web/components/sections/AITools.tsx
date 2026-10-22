import { MotionReveal } from "@/components/MotionReveal";
import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import styles from "./AITools.module.css";
import { studioTools } from "@/data/studio-tools";
import { ToolMarquee } from "@/components/ToolMarquee";

export function AITools() {
  return (
    <aside className={styles.band} aria-label="Tools we work with">
      <div className="shell">
        <MotionReveal className={styles.inner}>
          <div className={styles.intro}>
            <p className={`eyebrow ${styles.label}`}>
              AI-assisted. Human-crafted.
            </p>
            <p className={styles.credential}>
              <BadgeCheck size={16} aria-hidden="true" />
              <span>Certified Lovable &amp; Replit expert</span>
            </p>
          </div>
          <ToolMarquee>
            {[false, true].map((duplicate) => (
              <ul
                className={styles.tools}
                role="list"
                key={String(duplicate)}
                aria-hidden={duplicate || undefined}
              >
                {studioTools.map((tool) => (
                  <li
                    key={tool.name}
                    className={`${styles.tool} ${"typography" in tool ? styles[tool.typography] : ""}`}
                  >
                    <Image
                      src={`/assets/tools/${tool.logo}`}
                      alt=""
                      aria-hidden="true"
                      width={"wordmark" in tool ? 65 : 28}
                      height={28}
                      loading="eager"
                      className={`${styles.logo} ${"original" in tool ? styles.originalLogo : ""} ${"wordmark" in tool ? styles.wordmark : ""}`}
                      unoptimized
                    />
                    <span
                      className={"wordmark" in tool ? "sr-only" : undefined}
                    >
                      {tool.name}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </ToolMarquee>
        </MotionReveal>
      </div>
    </aside>
  );
}
