import { MotionReveal } from "@/components/MotionReveal";
import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import styles from "./AITools.module.css";

const tools = [
  { name: "Replit", logo: "replit" },
  { name: "Lovable", logo: "lovable" },
  { name: "Claude", logo: "claude", style: styles.serif },
  { name: "Codex", logo: "codex", style: styles.mono },
  { name: "Base44", logo: "base44" },
  { name: "Cursor", logo: "cursor" },
];

export function AITools() {
  return (
    <aside className={styles.band} aria-label="AI tools we work with">
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
          <ul className={styles.tools} role="list">
            {tools.map((tool) => (
              <li
                key={tool.name}
                className={`${styles.tool} ${tool.style ?? ""}`}
              >
                <Image
                  src={`/assets/tools/${tool.logo}.svg`}
                  alt=""
                  aria-hidden="true"
                  width={28}
                  height={28}
                  className={styles.logo}
                  unoptimized
                />
                <span>{tool.name}</span>
              </li>
            ))}
          </ul>
        </MotionReveal>
      </div>
    </aside>
  );
}
