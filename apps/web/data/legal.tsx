import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalDocumentData } from "../components/LegalDocument";
import { site } from "../lib/site";

function ExternalPolicy({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
const contactPath = "/?view=html#contact";
const updated = "2026-11-06";
function ContactEmail() {
  return <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>;
}

export const privacyPolicy: LegalDocumentData = {
  title: "Privacy Policy",
  path: "/privacy-policy",
  description: `How ${site.legalName}, trading as PromDevs, handles information from website visits, enquiries, attachments, and call bookings.`,
  introduction:
    "How we handle the information you share with us, the services that help this website run, and the choices available to you.",
  updated,
  related: { title: "Terms of Service", path: "/terms-of-service" },
  sections: [
    {
      id: "who-we-are",
      title: "Who we are",
      content: (
        <>
          <p>
            <strong>{site.legalName}</strong> operates this website under the
            brand <strong>PromDevs</strong>. In this policy, “we”, “us”, and
            “our” refer to that business.
          </p>
          <p>
            This policy covers our public website, enquiries, meeting bookings,
            and related business communications. When we handle personal
            information on a client’s behalf while delivering a project, the
            relevant project agreement and data-processing arrangements also
            apply. Other products linked from our portfolio have their own
            privacy notices.
          </p>
          <p>
            For questions or privacy requests, email <ContactEmail /> or use our{" "}
            <Link href={contactPath}>contact form</Link> and include “Privacy
            request” in the subject.
          </p>
        </>
      ),
    },
    {
      id: "information-we-handle",
      title: "Information we handle",
      content: (
        <>
          <ul>
            <li>
              <strong>Enquiries and attachments:</strong> your name, email
              address, subject, message, and any files or other information you
              choose to send.
            </li>
            <li>
              <strong>Call bookings:</strong> the contact details, time zone,
              selected meeting time, answers, and notes you provide through our
              booking service.
            </li>
            <li>
              <strong>Business communications:</strong> correspondence and
              project-related details you share as we discuss or deliver work.
            </li>
            <li>
              <strong>Website and security information:</strong> network
              identifiers such as IP addresses, browser and device details, page
              requests, referral information, and timestamps processed by our
              website, analytics, and infrastructure providers.
            </li>
            <li>
              <strong>Public portfolio information:</strong> project details and
              client or reviewer names, roles, companies, images, and feedback
              where supplied for publication.
            </li>
          </ul>
          <p>
            Please do not send passwords, API keys, payment-card details, or
            sensitive personal information through an enquiry or booking. Only
            share someone else’s information if you are entitled to do so.
          </p>
        </>
      ),
    },
    {
      id: "how-we-use-information",
      title: "How we use information",
      content: (
        <>
          <p>
            We use information to respond to enquiries, understand project
            requirements, arrange calls, prepare proposals, deliver agreed work,
            maintain business records, protect our systems, and understand how
            the website is used.
          </p>
          <p>
            Published work and feedback help visitors understand our services.
            Contact us if you have a concern about your attribution or
            information shown in a project or review.
          </p>
          <p>
            Depending on the activity and applicable law, processing may be
            based on steps you request before a contract, performance of a
            contract, legal obligations, legitimate interests such as responding
            to enquiries and maintaining security, or consent where required.
            Where we rely on consent, you may withdraw it without affecting
            processing that was lawful before withdrawal.
          </p>
        </>
      ),
    },
    {
      id: "cookies-and-analytics",
      title: "Cookies and analytics",
      content: (
        <>
          <p>
            The website stores your light or dark theme preference in your
            browser’s local storage. We also remember your analytics choice in
            local storage for up to 180 days, after which we ask again.
            Restricted administrative areas also use authentication cookies when
            authorised staff sign in.
          </p>
          <p>
            We load <strong>Google Analytics</strong> only after you allow
            optional analytics. This helps us understand page visits and
            successful enquiries. Our enquiry events record the channel, not
            names, email addresses, message text, attachments, booking IDs, or
            meeting details. Analytics can use cookies and similar identifiers
            and process device and usage information. Read{" "}
            <ExternalPolicy href="https://policies.google.com/privacy/partners">
              how Google handles information from sites using its services
            </ExternalPolicy>{" "}
            and{" "}
            <ExternalPolicy href="https://policies.google.com/technologies/cookies">
              Google’s cookie information
            </ExternalPolicy>
            .
          </p>
          <p>
            Choose “Essential only” to leave optional analytics off. You can
            allow or withdraw analytics using “Privacy choices” in the footer at
            any time. Withdrawal stops future measurement and removes accessible
            first-party Google Analytics cookies; it does not erase information
            already received by Google. Contact and booking remain available
            without allowing analytics. With JavaScript disabled, our analytics
            script does not load.
          </p>
          <p>
            You can manage cookies and local storage through your browser
            settings. Google also provides a{" "}
            <ExternalPolicy href="https://tools.google.com/dlpage/gaoptout">
              Google Analytics opt-out browser add-on
            </ExternalPolicy>
            . Browser controls may not prevent every network request or type of
            measurement, and limiting storage can affect some features.
          </p>
          <p>
            When you open the booking calendar, your browser connects to
            Cal.com. That service may use its own storage and process the
            information needed to display availability and arrange a booking.
          </p>
        </>
      ),
    },
    {
      id: "service-providers",
      title: "Service providers and sharing",
      content: (
        <>
          <p>
            We use providers to operate the website and communicate with you.
            They may handle information relevant to the service they provide,
            including:
          </p>
          <ul>
            <li>
              <strong>Resend:</strong> delivery of contact messages and optional
              attachments. See{" "}
              <ExternalPolicy href="https://resend.com/legal/privacy-policy">
                Resend’s privacy policy
              </ExternalPolicy>
              .
            </li>
            <li>
              <strong>Cal.com:</strong> scheduling and booking information. See{" "}
              <ExternalPolicy href="https://cal.com/privacy">
                Cal.com’s privacy policy
              </ExternalPolicy>
              .
            </li>
            <li>
              <strong>Google Analytics:</strong> website measurement, as
              described above.
            </li>
            <li>
              <strong>
                Cloudflare and our hosting, database, and infrastructure
                providers:
              </strong>{" "}
              website delivery, security, storage, and operation. See{" "}
              <ExternalPolicy href="https://www.cloudflare.com/privacypolicy/">
                Cloudflare’s privacy policy
              </ExternalPolicy>
              .
            </li>
          </ul>
          <p>
            We may also disclose information where required by law, to protect
            legal rights or safety, or to professional advisers where necessary.
            We do not sell your personal information. External services and
            websites may also process information for their own purposes under
            their notices.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "How long we keep information",
      content: (
        <>
          <p>
            We keep information for as long as reasonably needed for the
            purposes described here, taking account of the status of an enquiry,
            an ongoing client relationship, contractual and record-keeping
            obligations, security needs, and the resolution of disputes.
          </p>
          <p>
            Messages and their attachments may be retained together as business
            correspondence. There is no single retention period that applies to
            every record. When information is no longer needed, we seek to
            delete or anonymise it, subject to legal requirements and the
            retention of copies held by service providers.
          </p>
        </>
      ),
    },
    {
      id: "international-processing",
      title: "International processing",
      content: (
        <>
          <p>
            Our providers may process information in countries other than your
            own. Their locations and service arrangements can affect where
            information is handled. Where applicable law requires protections
            for an international transfer, the relevant transfer requirements
            must be addressed for that processing.
          </p>
          <p>
            You can contact us to ask about the providers or arrangements
            relevant to your information.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "Keeping information secure",
      content: (
        <>
          <p>
            We use technical and organisational measures intended to limit
            unauthorised access and protect information. Access is limited
            according to the work people need to perform. No internet
            transmission or storage system can be guaranteed completely secure.
          </p>
          <p>
            If your enquiry involves sensitive material or access to a live
            system, ask us to agree a suitable sharing method before sending it.
            An initial enquiry is not a request to upload credentials or a
            production database.
          </p>
        </>
      ),
    },
    {
      id: "your-rights",
      title: "Your rights and requests",
      content: (
        <>
          <p>
            Depending on the law that applies to you and the processing
            involved, you may have rights to request access, correction,
            deletion, restriction, or a portable copy of your personal
            information; object to certain processing; or withdraw consent where
            it is the basis for processing.
          </p>
          <p>
            Send requests by email to <ContactEmail /> or through our{" "}
            <Link href={contactPath}>contact form</Link>, with “Privacy request”
            in the subject. Describe the request without including sensitive
            information unnecessarily. We may ask for information needed to
            verify your identity and will handle requests within applicable
            legal time limits. Some information may need to be retained where a
            legal obligation or other lawful exception applies.
          </p>
          <p>
            You may also raise a concern with the data-protection authority
            relevant to you. Where Nigerian data-protection law applies, this
            includes the{" "}
            <ExternalPolicy href="https://ndpc.gov.ng/">
              Nigeria Data Protection Commission
            </ExternalPolicy>
            .
          </p>
        </>
      ),
    },
    {
      id: "children",
      title: "Children’s information",
      content: (
        <p>
          The website is intended for professional enquiries and is not designed
          to collect information from children. If you believe a child has
          provided personal information that should not be held, please contact
          us so we can review it.
        </p>
      ),
    },
    {
      id: "privacy-updates",
      title: "Updates and contact",
      content: (
        <>
          <p>
            We may update this policy when our practices or legal obligations
            change. The date at the top identifies the latest revision. Where
            the law requires additional notice of a material change, we will
            provide it.
          </p>
          <p>
            For privacy questions, contact <strong>{site.legalName}</strong>,
            trading as PromDevs, at <ContactEmail /> or through our{" "}
            <Link href={contactPath}>contact form</Link>.
          </p>
        </>
      ),
    },
  ],
};

export const termsOfService: LegalDocumentData = {
  title: "Terms of Service",
  path: "/terms-of-service",
  description: `Terms for using the PromDevs website, contacting ${site.legalName}, and understanding how separate project agreements apply.`,
  introduction:
    "The terms for using our website, sending an enquiry, and exploring our work. Paid project services are covered by a separate agreement.",
  updated,
  related: { title: "Privacy Policy", path: "/privacy-policy" },
  sections: [
    {
      id: "website-operator",
      title: "Who operates this website",
      content: (
        <>
          <p>
            This website is operated by <strong>{site.legalName}</strong>,
            trading as <strong>PromDevs</strong>. “We”, “us”, and “our” mean
            that business. “You” means the person using the website or, where
            authorised, the organisation they represent.
          </p>
          <p>
            These terms concern the public website and its enquiry and booking
            facilities. Please use them alongside our{" "}
            <Link href="/privacy-policy">Privacy Policy</Link>.
          </p>
        </>
      ),
    },
    {
      id: "website-and-project-services",
      title: "Website use and project services",
      content: (
        <>
          <p>
            The website describes our product management, design, and
            engineering services and presents selected work and feedback. It is
            an invitation to discuss a project, not a complete specification or
            binding offer to deliver one.
          </p>
          <p>
            Sending an enquiry, sharing a brief, receiving an initial response,
            or booking a discovery call does not by itself create a project
            contract or reserve delivery capacity.
          </p>
          <p>
            Scope, fees, payment terms, milestones, responsibilities,
            confidentiality, intellectual-property rights, support, and any
            service commitments must be set out in a separate project agreement.
            That agreement governs the relevant services; these website terms do
            not amend an existing project contract.
          </p>
        </>
      ),
    },
    {
      id: "enquiries-and-bookings",
      title: "Enquiries and bookings",
      content: (
        <>
          <p>
            Provide accurate contact details and only submit information you are
            entitled to share. If acting for another person or organisation, you
            must have the authority needed for that communication.
          </p>
          <p>
            A calendar slot is for the meeting described on the booking page.
            Changes, cancellations, and rescheduling are handled through the
            booking service or by contacting us. A booked call is not a promise
            of project acceptance, pricing, or a particular outcome.
          </p>
          <p>
            Do not send passwords, private keys, payment-card details, or
            sensitive production data through the public form. If material
            requires special confidentiality or security arrangements, ask us to
            agree those arrangements first.
          </p>
        </>
      ),
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      content: (
        <>
          <p>
            Use the website lawfully and without interfering with other people’s
            access or rights. You must not:
          </p>
          <ul>
            <li>
              Attempt to access restricted systems, accounts, or information
              without permission.
            </li>
            <li>
              Introduce malware, exploit vulnerabilities, flood the website with
              requests, or disrupt its operation.
            </li>
            <li>
              Submit unlawful, infringing, deceptive, or harmful content, or
              impersonate another person.
            </li>
            <li>
              Collect or misuse personal information about clients, reviewers,
              or other people featured on the website.
            </li>
          </ul>
          <p>
            We may restrict abusive or unauthorised access where reasonably
            necessary to protect the website and the people using it.
          </p>
        </>
      ),
    },
    {
      id: "website-content",
      title: "Website content and ownership",
      content: (
        <>
          <p>
            Website text, design, imagery, code, and other materials are owned
            by us or used with permission, except where another owner is
            identified. Client projects, third-party products, logos, and
            trademarks remain subject to their owners’ rights.
          </p>
          <p>
            You may view the website, share links to public pages, and use its
            information to evaluate working with us. Reproducing materials for
            another commercial use requires the relevant owner’s permission
            unless applicable law permits that use.
          </p>
          <p>
            Do not imply that we or a featured client endorse you. Showing a
            tool or platform does not imply that its owner endorses PromDevs.
          </p>
        </>
      ),
    },
    {
      id: "your-submissions",
      title: "Materials you send us",
      content: (
        <>
          <p>
            You retain rights you hold in the material you send. Providing it
            allows us to review and use it as reasonably needed to respond to
            your enquiry, assess requirements, and discuss potential work,
            subject to the Privacy Policy and any applicable agreement.
          </p>
          <p>
            Submitting a file does not transfer ownership to us or create a
            broad licence to publish it. Any wider use, deliverable ownership,
            or confidentiality commitments for project work must be addressed in
            the relevant agreement.
          </p>
        </>
      ),
    },
    {
      id: "third-party-services",
      title: "Third-party services and links",
      content: (
        <>
          <p>
            The website links to client products, app stores, review sources,
            and other external services. Meeting bookings are provided through
            Cal.com. External services have their own terms, privacy practices,
            and availability, which we do not control.
          </p>
          <p>
            A link is provided for context or convenience, not as a guarantee of
            the external service’s content, security, or suitability. Review the
            relevant provider’s terms before using it.
          </p>
        </>
      ),
    },
    {
      id: "information-and-availability",
      title: "Information and availability",
      content: (
        <>
          <p>
            We aim to keep information useful and accurate, but may update,
            correct, or remove content. The website and its features may be
            interrupted or unavailable, including because of maintenance or
            third-party failures.
          </p>
          <p>
            Portfolio examples and testimonials describe particular work or
            experiences. They are not a guarantee that every project will
            produce the same results. Store approval, platform decisions,
            third-party performance, and commercial outcomes are not promised by
            this website.
          </p>
        </>
      ),
    },
    {
      id: "liability-and-your-rights",
      title: "Liability and your rights",
      content: (
        <>
          <p>
            To the extent permitted by applicable law, we do not accept
            liability for indirect or consequential loss arising from use of, or
            inability to use, the public website. Any limitation is subject to
            mandatory legal protections and the circumstances of the claim.
          </p>
          <p>
            Nothing in these terms excludes or limits liability that cannot
            lawfully be excluded or limited, or removes rights you have under
            applicable consumer or other mandatory law. Liability for paid
            project services is addressed in the relevant project agreement,
            subject to that law.
          </p>
        </>
      ),
    },
    {
      id: "changes-and-applicable-law",
      title: "Changes and applicable law",
      content: (
        <>
          <p>
            We may revise these website terms and show the revised date above.
            Changes relate to subsequent website use and do not retrospectively
            change a project agreement.
          </p>
          <p>
            These terms operate subject to applicable law. Any governing-law or
            dispute-resolution provisions for project services belong in the
            relevant written agreement. If something about the website causes
            concern, contact us so we can try to resolve it.
          </p>
        </>
      ),
    },
    {
      id: "terms-contact",
      title: "Contact us",
      content: (
        <p>
          For questions about these terms, contact{" "}
          <strong>{site.legalName}</strong>, trading as PromDevs, at{" "}
          <ContactEmail /> or through our{" "}
          <Link href={contactPath}>contact form</Link> and include “Website
          terms” in the subject.
        </p>
      ),
    },
  ],
};
