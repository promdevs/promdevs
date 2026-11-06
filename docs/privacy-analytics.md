# Privacy choices and enquiry measurement

## Public contact

`site.contactEmail` is info@promdevs.com, used by the footer, homepage contact
section, Privacy Policy and Terms of Service. The form's actual destination
remains the API's `CONTACT_TO_EMAIL` environment variable. No runtime secrets,
admin accounts, meeting-owner email, or deployment settings were changed.

## Consent

- Default unknown and Essential only both block the Google SDK from loading.
- Allow analytics loads only the verified PromDevs web stream G-L0FJ2JDD88
  (property 532529936, stream 14350304014). Its measurement ID is shared by
  the SDK loader, configuration and collection-disable flag.
- No advertising permission, Google signals, or ad personalisation is enabled.
- The versioned local-storage preference lasts 180 days. Invalid or expired
  records require a new choice. Storage failures keep a choice in tab memory.
- Privacy choices in the footer opens a native modal with keyboard dismissal
  and focus return. No preference UI or Google SDK runs without JavaScript.
- Updates synchronize across tabs; focus, visibility and periodic checks
  catch expired/cleared preferences. Rejecting or withdrawing disables GA
  collection and removes accessible first-party GA cookies without removing
  the theme or other application cookies.
- Already transmitted data cannot be recalled. In-flight requests started
  while permission was granted cannot be retroactively undone.
- The requested Cal.com booking interface is separate: it loads only when
  opened and remains usable regardless of the optional analytics choice.

## Events

The one enquiry event is `generate_lead`, with `lead_method` set to
`contact_form` or `discovery_call`:

- Form events run only after a successful enhanced POST response, never on
  button clicks, validation errors, failed delivery, or URL receipt flags.
- Cal events use `bookingSuccessfulV2`, require ACCEPTED status, a booking UID
  and no outstanding payment, and deduplicate in bounded tab memory. Pending,
  rescheduled, cancelled and dry-run bookings are not counted. Booking UIDs
  are never sent to Analytics or stored persistently.
- No unconsented enquiry is buffered for later opt-in. No names, email
  addresses, subjects, messages, filenames, attachments or booking payloads
  are passed into enquiry tracking.
- Explicit page views strip queries, hashes and referrers. Project detail
  views are grouped at `/projects/detail`; unknown paths at `/not-found`.
- Normal navigation is tracked once per pathname transition, including on
  client navigation. Consent withdrawal stops future events.

## GA4 property configuration still required

These changes do not access or modify the external GA4 account:

1. Disable Enhanced Measurement for this stream to avoid automatic form,
   outbound-link, site-search and history events outside this controlled
   event scheme, as well as duplicate page views. Disable any separate tag
   injections (e.g. Cloudflare or GTM) that would bypass this consent gate.
2. Register `lead_method` as an event-scoped custom dimension if channel
   breakdowns are wanted in reports.
3. Mark `generate_lead` as a key event if it should count toward conversions.
4. Check retention, access and privacy settings against actual business needs.

No live enquiries, meetings or real Analytics events should be created during
automated verification. Browser tests stub the external SDK/contact response.

## Primary references

- https://developers.google.com/tag-platform/security/concepts/consent-mode
- https://developers.google.com/tag-platform/security/guides/consent
- https://developers.google.com/tag-platform/security/guides/privacy
- https://cal.com/help/embedding/embed-events

This implements technical privacy controls, not a certification of compliance
with every jurisdiction. The owner's policy review remains necessary.
