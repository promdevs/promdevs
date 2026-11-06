import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { termsOfService } from "@/data/legal";
import { socialMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: termsOfService.title,
  description: termsOfService.description,
  alternates: { canonical: termsOfService.path },
  ...socialMetadata({
    title: termsOfService.title,
    description: termsOfService.description,
    path: termsOfService.path,
  }),
};

export default function TermsOfServicePage() {
  return <LegalDocument document={termsOfService} />;
}
