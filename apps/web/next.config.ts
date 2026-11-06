import type { NextConfig } from "next";
import path from "node:path";
import { portfolioImagePattern } from "./lib/image-delivery";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  transpilePackages: ["@promdevs/contracts"],
  images: {
    remotePatterns: [portfolioImagePattern],
    maximumRedirects: 0,
  },
};

export default nextConfig;
