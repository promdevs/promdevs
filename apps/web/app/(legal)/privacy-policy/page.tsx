import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { privacyPolicy } from "@/data/legal";
import { socialMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: privacyPolicy.title,
  description: privacyPolicy.description,
  alternates: { canonical: privacyPolicy.path },
  ...socialMetadata({
    title: privacyPolicy.title,
    description: privacyPolicy.description,
    path: privacyPolicy.path,
  }),
};

export default function PrivacyPolicyPage() {
  return <LegalDocument document={privacyPolicy} />;
}
