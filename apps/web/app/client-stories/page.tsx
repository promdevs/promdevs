import type { Metadata } from "next";
import { getReviewCatalog } from "@/lib/api";
import { ClientStoriesDirectory } from "@/components/ClientStoriesDirectory";
import { socialMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
const description =
  "Read what clients say about working with PromDevs on web apps, mobile apps, AI products, and improving existing products.";
export const metadata: Metadata = {
  title: "Client stories",
  description,
  alternates: { canonical: "/client-stories" },
  ...socialMetadata({
    title: "Client stories",
    description,
    path: "/client-stories",
  }),
};

export default async function ClientStoriesPage() {
  return <ClientStoriesDirectory reviews={await getReviewCatalog()} />;
}
