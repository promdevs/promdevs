import Image from "next/image";
import type { CSSProperties } from "react";
import { WandSparkles } from "lucide-react";
import { studioTools } from "../data/studio-tools";
import { projectLabel } from "../lib/project-catalog";

const accents: Record<string, string> = {
  replit: "#f26207",
  lovable: "#f76893",
  claude: "#d97757",
  base44: "#ff6a00",
  codex: "#7f8c9c",
  cursor: "#7f8c9c",
  bolt: "#7f8c9c",
  v0: "#7f8c9c",
};

export function ProjectTools({ tools }: { tools: string[] }) {
  if (!tools.length) return null;
  return (
    <section className="case-toolkit" aria-labelledby="case-toolkit-heading">
      <h3 id="case-toolkit-heading">
        <WandSparkles size={16} aria-hidden="true" />
        Tools behind the build
      </h3>
      <ul>
        {tools.map((value) => {
          const key = value.toLowerCase();
          const tool =
            studioTools.find((item) => item.name.toLowerCase() === key) ||
            (key === "v0"
              ? { name: "v0", logo: "v0.svg", wordmark: true }
              : undefined);
          const wordmark = tool && "wordmark" in tool;
          const monochrome = [
            "codex",
            "cursor",
            "bolt",
            "framer",
            "v0",
          ].includes(key);
          return (
            <li
              key={value}
              style={
                { "--tool-accent": accents[key] || "#2563eb" } as CSSProperties
              }
            >
              <span
                className={`case-tool-logo${wordmark ? " case-tool-wordmark" : ""}`}
                aria-hidden="true"
              >
                {tool ? (
                  <Image
                    src={`/assets/tools/${tool.logo}`}
                    alt=""
                    width={wordmark ? 60 : 30}
                    height={30}
                    unoptimized
                    className={monochrome ? "case-tool-monochrome" : undefined}
                  />
                ) : (
                  <WandSparkles size={26} />
                )}
              </span>
              <span className={wordmark ? "sr-only" : "case-tool-name"}>
                {tool?.name || projectLabel(value)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
