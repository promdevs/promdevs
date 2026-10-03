import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve(".next/standalone/apps/web");
await mkdir(resolve(target, ".next"), { recursive: true });
await cp(resolve("public"), resolve(target, "public"), { recursive: true });
await cp(resolve(".next/static"), resolve(target, ".next/static"), {
  recursive: true,
});
console.log(
  "Standalone web server prepared with public assets and static chunks.",
);
