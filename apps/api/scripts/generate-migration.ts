import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { orderPortfolioConstraints } from "../src/db/migration-order.js";

type Entry = { tag: string; when: number };
async function entries(): Promise<Entry[]> {
  const journal = JSON.parse(
    await readFile(resolve("drizzle/meta/_journal.json"), "utf8"),
  );
  return journal.entries;
}

async function generate() {
  const before = await entries();
  const args = process.argv.slice(2);
  if (args.some((arg) => /^--(config|out)(=|$)/.test(arg))) {
    console.error(
      "This wrapper uses the canonical config and drizzle directory. Use only generation options such as --name.",
    );
    process.exitCode = 1;
    return;
  }
  const child = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "drizzle-kit", "generate", ...args],
    { stdio: "inherit" },
  );
  if (child.status !== 0 || child.error) {
    process.exitCode = child.status || 1;
    return;
  }
  for (const entry of await entries()) {
    // Never rewrite a previously generated or applied historical migration.
    if (before.some((old) => old.tag === entry.tag && old.when === entry.when))
      continue;
    if (!/^[a-zA-Z0-9_-]+$/.test(entry.tag))
      throw new Error("Invalid journal tag");
    const path = resolve("drizzle", `${entry.tag}.sql`);
    const original = await readFile(path, "utf8");
    const ordered = orderPortfolioConstraints(original);
    if (ordered !== original) {
      await writeFile(path, ordered);
      console.info(
        `Ordered the project composite UNIQUE before its review FK in ${entry.tag}. Review the generated SQL before applying.`,
      );
    }
  }
}

generate().catch(() => {
  console.error(
    "Migration generation/order check failed. Review generated files; no database migration was run.",
  );
  process.exitCode = 1;
});
