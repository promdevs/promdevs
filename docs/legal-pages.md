# Legal Pages

## Scope

`/privacy-policy` and `/terms-of-service` are initial policy drafts, not a legal opinion or a certification of compliance. They identify PROMDEVS TECHNOLOGY CONCEPTS as the registered business trading as PromDevs. They use the owner's confirmed public inbox, info@promdevs.com, and the existing contact form; no registration address has been invented.

The content is server-rendered in `apps/web/data/legal.tsx`. Both routes share `LegalDocument` and the legal layout. The revision date is explicit, not regenerated on each visit or build. Update it when the policies materially change.

The Terms concern the website and initial enquiries. Commercial project terms, IP ownership, service levels, fees, payment schedules, confidentiality and governing law are left to the relevant project agreement.

## Implementation Checked

- `app/layout.tsx` includes the privacy controller. Google Analytics is loaded only after opt-in; the footer's Privacy choices control allows withdrawal.
- `themeInit` stores the theme in browser local storage.
- The booking calendar loads when a visitor chooses the booking tab; Cal.com receives booking data.
- The API forwards validated contact details and optional attachments through Resend.
- The API uses request IP information for abuse controls.
- Public portfolio endpoints expose published content and respect public review identity settings.
- Consent choices expire after 180 days. Enquiry events carry only the channel and sanitised page context. No migration, new processor, API email destination, or live data change is part of these pages.

## Before Relying on These Policies

Have the owner and qualified counsel review the drafts against the business's jurisdiction and actual operations. Confirm:

- Registration country, business address, registration details and any legally required public disclosures.
- Monitoring info@promdevs.com and the process for responding to requests.
- Applicable laws, legal bases, any required privacy representative or data-protection officer, and complaint procedures.
- Retention schedules for enquiries, email attachments, bookings, analytics, portfolio information, logs, and backups. No fixed period or automated purge has been invented.
- Actual hosting/database providers, processing regions, vendor agreements and international-transfer safeguards. The policy does not claim a particular transfer agreement has been signed.
- Google Analytics property settings and any additional jurisdiction-specific consent requirements. See `docs/privacy-analytics.md` for the implemented opt-in mechanism and outstanding property configuration. A consent UI alone is not a certification of legal compliance.
- Scope of confidentiality, portfolio permissions and liability language. These site terms do not replace a negotiated project agreement or mandatory rights.

## Primary References Consulted

These are supporting references, not a claim that every jurisdiction below applies to the business:

- Nigeria Data Protection Commission: https://ndpc.gov.ng/our-data-privacy-policy/ and https://ndpc.gov.ng/download/nigeria-data-protection-act-2023
- Google partner-site information: https://policies.google.com/privacy/partners
- Google cookie information: https://policies.google.com/technologies/cookies
- Google EU user consent policy: https://www.google.com/about/company/user-consent-policy/
- Cal.com privacy policy: https://cal.com/privacy
- Resend privacy policy: https://resend.com/legal/privacy-policy
