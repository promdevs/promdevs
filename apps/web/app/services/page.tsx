import type { Metadata } from "next";
import { ServicesOverview } from "@/components/ServicesOverview";
import { servicesDescription } from "@/data/services";
import { socialMetadata } from "@/lib/seo";

const title = "Product Design, Web, Mobile & AI Development";
export const metadata: Metadata = {
  title,
  description: servicesDescription,
  alternates: { canonical: "/services" },
  ...socialMetadata({
    title,
    description: servicesDescription,
    path: "/services",
  }),
};

export default function ServicesPage() {
  return <ServicesOverview />;
}
