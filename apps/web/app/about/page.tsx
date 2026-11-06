import type { Metadata } from "next";
import { AboutStudio } from "@/components/AboutStudio";
import { socialMetadata } from "@/lib/seo";

const description =
  "Meet the PromDevs team: product managers, product designers, frontend and backend engineers, and mobile developers, led by Moses Adebayo (muzardemoses).";

export const metadata: Metadata = {
  title: "About the studio",
  description,
  alternates: { canonical: "/about" },
  ...socialMetadata({
    title: "About the studio",
    description,
    path: "/about",
  }),
};

export default function AboutPage() {
  return <AboutStudio />;
}
