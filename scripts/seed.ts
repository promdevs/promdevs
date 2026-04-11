import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { projects } from '../db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const seedProjects = [
  {
    title: 'FlowSync',
    slug: 'flow-sync',
    description:
      'Unified operations dashboard that aggregates data from 30+ enterprise tools into a single source of truth with real-time alerting and role-based access control.',
    category: 'SaaS',
    techStack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Redis', 'WebSockets'],
    featured: true,
    status: 'completed',
    year: 2024,
    problem:
      'Enterprise ops teams managed 30+ disconnected tools—Jira, PagerDuty, Datadog, Slack—with no unified view. Critical incidents were missed because context lived across five different dashboards, and on-call engineers spent the first 20 minutes of every incident just gathering data.',
    solution:
      'FlowSync is a role-based operations dashboard with live bidirectional sync across major SaaS tools via webhooks and polling adapters. Engineers get a single pane of glass with smart alert correlation that deduplicates and prioritizes signals through a severity engine before surfacing them to the team.',
    results:
      '60% reduction in mean time to acknowledge incidents. 2.4× faster resolution. Engineering team reclaimed 18 hours per week previously lost to context-switching across tools.',
    tags: ['Operations', 'SaaS', 'Real-time', 'Enterprise'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'NeuralCart',
    slug: 'neural-cart',
    description:
      'ML-powered e-commerce personalization engine that adapts product recommendations in real-time based on session behavior, purchase history, and cohort signals.',
    category: 'AI',
    techStack: ['Python', 'FastAPI', 'React', 'TensorFlow', 'MongoDB'],
    featured: true,
    status: 'completed',
    year: 2024,
    problem:
      'A mid-market e-commerce brand with 800K SKUs was serving the same homepage to every visitor. Recommendation logic was a static "bestsellers" list updated weekly. Conversion rate sat at 1.8% despite strong traffic.',
    solution:
      'NeuralCart integrates with any e-commerce platform via a JavaScript snippet and REST API. A collaborative filtering model trains on purchase events nightly, while a lightweight session model adapts recommendations within milliseconds of each click using a feature vector computed at request time.',
    results:
      '34% lift in conversion rate within 60 days of deployment. $2.1M in attributable incremental revenue in the first year. Recommendation click-through rate increased from 4% to 19%.',
    tags: ['Machine Learning', 'E-commerce', 'Personalization', 'Real-time'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'VaultPay',
    slug: 'vault-pay',
    description:
      'Compliant multi-currency payment infrastructure for fintech startups—KYC/AML baked in, Stripe and Plaid integrated, and built to scale from MVP to $50M+ in transaction volume.',
    category: 'Fintech',
    techStack: ['Node.js', 'TypeScript', 'PostgreSQL', 'Stripe', 'Plaid'],
    featured: true,
    status: 'completed',
    year: 2023,
    problem:
      'An early-stage fintech was wasting 60% of engineering cycles on compliance plumbing—KYC workflows, AML screening, multi-currency ledger reconciliation—before writing a single line of product logic. Compliance consultants cost $300/hr and created 3-month delays before each market expansion.',
    solution:
      'VaultPay is a compliance-as-code SDK that abstracts KYC/AML verification, multi-currency ledger management, and payment routing behind a clean API. It handles Stripe for card payments and Plaid for bank linkage, with a unified webhook model and automatic currency conversion at settlement.',
    results:
      '99.97% payment uptime across 15 supported currencies. $50M+ in transaction volume processed. Compliance setup time reduced from 3 months to 2 weeks per new market.',
    tags: ['Payments', 'Compliance', 'Fintech', 'KYC'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'MedTrack Pro',
    slug: 'med-track-pro',
    description:
      'HIPAA-compliant patient management platform with EHR integration, appointment scheduling, telemedicine, and automated care coordination for outpatient clinic networks.',
    category: 'Healthtech',
    techStack: ['Next.js', 'PostgreSQL', 'FHIR API', 'WebRTC', 'TypeScript'],
    featured: false,
    status: 'completed',
    year: 2023,
    problem:
      'A network of 12 outpatient clinics ran on paper records, whiteboard schedules, and five incompatible legacy systems. Staff spent 3+ hours daily on administrative tasks. The patient no-show rate was 32%, and billing errors cost the network $180K annually.',
    solution:
      'MedTrack Pro unifies scheduling, patient records, billing, and telemedicine in a single HIPAA-compliant platform. FHIR API integration pulls historical records from legacy EHR systems. Automated SMS/email reminders were built into the appointment flow. WebRTC powers async and live video consultations without third-party software.',
    results:
      '40% reduction in administrative time per staff member. No-show rate dropped from 32% to 11%. Billing error rate decreased by 78%, recovering $140K in previously lost revenue annually.',
    tags: ['HIPAA', 'EHR', 'Telemedicine', 'Healthcare'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'LearnForge',
    slug: 'learn-forge',
    description:
      'AI-adaptive edtech platform that builds personalized learning paths for each student, adjusting curriculum pacing and content format based on real-time performance signals.',
    category: 'Edtech',
    techStack: ['React', 'Node.js', 'OpenAI API', 'PostgreSQL', 'Redis'],
    featured: false,
    status: 'completed',
    year: 2024,
    problem:
      'A network of 14 private schools used a static, one-size-fits-all online curriculum. High-achieving students were disengaged due to slow pacing. Struggling students fell behind silently—teachers had no early warning signals until assessment results arrived weeks later.',
    solution:
      "LearnForge generates a unique learning path for each student on enrollment and continuously reweights content based on quiz performance, time-on-task signals, and error patterns. A teacher dashboard surfaces at-risk students 48 hours before their trajectory becomes critical. Lesson format—video, text, interactive—adapts to each learner's engagement patterns.",
    results:
      '28% improvement in course completion rates. Teacher early intervention rate improved by 3×. Average assessment score across the network increased from 71% to 84% within one academic year.',
    tags: ['AI', 'Education', 'Personalization', 'EdTech'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'HireLoop',
    slug: 'hire-loop',
    description:
      'Skill-verified developer marketplace that cuts time-to-hire from months to days through automated technical screening, portfolio validation, and structured async interviews.',
    category: 'Marketplace',
    techStack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Stripe', 'GitHub API'],
    featured: false,
    status: 'completed',
    year: 2024,
    problem:
      'Venture-backed startups were spending 4+ months and $25K+ in recruiter fees to hire a single senior developer. Technical interview loops consumed 40 engineering hours per candidate. 30% of hires who passed interviews underperformed in their first 90 days.',
    solution:
      'HireLoop is a curated marketplace where developers complete a standardized technical assessment, submit a verified portfolio (auto-graded via GitHub API), and record async video responses to structured questions. Companies browse pre-screened profiles and run a single final-round conversation—often making an offer within a week.',
    results:
      'Average time-to-hire reduced from 4 months to 18 days. Engineering interview hours per hire dropped from 40 to 6. 90-day retention rate for HireLoop placements: 94%.',
    tags: ['Marketplace', 'Developer Hiring', 'Technical Screening', 'HR Tech'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'StackAudit',
    slug: 'stack-audit',
    description:
      'CI/CD-integrated static analysis platform that surfaces technical debt trends, prioritizes remediation effort by business impact, and tracks engineering health over time.',
    category: 'Developer Tools',
    techStack: ['TypeScript', 'GitHub Actions', 'PostgreSQL', 'Docker', 'Rust'],
    featured: false,
    status: 'completed',
    year: 2023,
    problem:
      "A Series B engineering org had accumulated years of technical debt with no systematic way to measure it. Engineering managers couldn't answer \"how much debt do we have?\" or \"is our codebase getting better?\" Security and compliance audits revealed issues that could have been caught months earlier.",
    solution:
      'StackAudit integrates into the CI pipeline via a GitHub Action and runs a custom Rust-based static analyzer on every pull request. Findings are classified by severity and categorized by debt type. A trend dashboard tracks debt score over time, correlates it with velocity, and generates a prioritized remediation backlog sorted by estimated ROI.',
    results:
      '45% reduction in critical bugs shipped to production. Security audit prep time reduced from 3 weeks to 4 days. Engineering leadership now reviews a weekly debt score alongside sprint velocity.',
    tags: ['Static Analysis', 'CI/CD', 'Technical Debt', 'Security'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'BookEase',
    slug: 'book-ease',
    description:
      'Embeddable booking platform for independent professionals and agencies—calendar sync, upfront payments, automated reminders, and a client portal, deployed with a single snippet.',
    category: 'Booking Platform',
    techStack: ['Next.js', 'Stripe', 'Google Calendar API', 'PostgreSQL', 'Resend'],
    featured: false,
    status: 'completed',
    year: 2023,
    problem:
      'Freelancers and boutique agencies were losing 40% of inbound leads to booking friction—long email chains, manual calendar coordination, awkward payment requests, and forgotten follow-ups. Popular scheduling tools lacked integrated payments and felt impersonal.',
    solution:
      'BookEase is a white-label booking widget deployed with two lines of code. It syncs available slots from Google Calendar, collects payment via Stripe at booking time, sends branded email reminders at T-48h and T-2h via Resend, and provides clients a self-serve portal to reschedule or cancel.',
    results:
      '3× increase in booking conversion vs email-based scheduling. 12,000+ professionals onboarded within 6 months. No-show rate for sessions dropped from 28% to 9% due to automated reminders.',
    tags: ['Scheduling', 'Payments', 'White-label', 'Productivity'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'DataPulse',
    slug: 'data-pulse',
    description:
      'Self-serve analytics dashboard with live data connectors, a no-code chart builder, and scheduled report delivery—eliminating the engineering bottleneck in data access.',
    category: 'Dashboard',
    techStack: ['Next.js', 'D3.js', 'Apache Kafka', 'ClickHouse', 'TypeScript'],
    featured: false,
    status: 'completed',
    year: 2024,
    problem:
      "A growth-stage SaaS company's marketing and product teams submitted 50+ data requests per month to engineering. Each report took 2–5 days. Engineers spent 20 hours per week writing one-off SQL queries and exporting CSVs. Business decisions were made on data that was already stale.",
    solution:
      'DataPulse gives non-technical teams direct access to live data through a no-code chart builder backed by ClickHouse for sub-second query performance. A drag-and-drop interface builds dashboards over pre-approved data models. Kafka streams keep metrics current in real-time. Scheduled exports deliver branded PDFs to stakeholders automatically.',
    results:
      'Engineering freed from 20 hours per week of report-writing. Time to insight for business teams dropped from 3 days to under 60 seconds. Data requests to engineering fell by 84%.',
    tags: ['Analytics', 'Data Visualization', 'No-code', 'BI'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'ShipForge',
    slug: 'ship-forge',
    description:
      'Real-time inventory sync and intelligent order routing platform for D2C brands managing multiple warehouses—automated carrier selection, live tracking, and self-serve returns.',
    category: 'E-commerce',
    techStack: ['Node.js', 'PostgreSQL', 'Redis', 'ShipStation API', 'React'],
    featured: false,
    status: 'completed',
    year: 2023,
    problem:
      'A fast-growing D2C brand operated 3 fulfillment warehouses with inventory reconciled manually every 24 hours via spreadsheet. Overselling was a weekly occurrence. Carrier selection was a guessing game. Returns were handled entirely by email.',
    solution:
      'ShipForge syncs inventory across all warehouse locations in real-time, reserves stock at checkout, and routes orders to the optimal fulfillment location based on proximity and inventory depth. A carrier selection engine queries 8 carriers at order time and picks the cheapest option within SLA. Returns are initiated through a self-serve customer portal.',
    results:
      '99.8% order accuracy across 50,000+ monthly orders. Shipping cost per order reduced by 22%. Returns processing time dropped from 14 days to 3 days. Overselling incidents: zero in 12 months post-launch.',
    tags: ['Logistics', 'Inventory', 'Fulfillment', 'E-commerce'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'Cognify',
    slug: 'cognify',
    description:
      'Brand-trained AI content platform with a built-in approval workflow, style guide enforcement, and direct CMS integration—turning a 5-day content cycle into a single afternoon.',
    category: 'AI',
    techStack: ['Next.js', 'OpenAI API', 'Contentful', 'PostgreSQL', 'TypeScript'],
    featured: false,
    status: 'completed',
    year: 2024,
    problem:
      'A B2B SaaS marketing team producing 200+ content pieces monthly struggled with inconsistent brand voice, a 5-day review cycle, and a content backlog stretching 6 weeks. Freelance writers delivered content that required heavy rewrites before approval.',
    solution:
      'Cognify fine-tunes a brand-specific language model on existing approved content and style guides. Writers use the AI assistant to generate first drafts that already match brand standards. A built-in workflow routes content to the right reviewer, tracks changes, and publishes directly to Contentful on approval. A real-time style guide checker flags deviations before submission.',
    results:
      '65% reduction in content production time. Brand consistency score improved by 40%. Content backlog eliminated within 45 days of deployment.',
    tags: ['AI Writing', 'Content', 'Brand', 'CMS'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
  {
    title: 'CareConnect',
    slug: 'care-connect',
    description:
      'HIPAA-compliant telemedicine platform connecting rural patients with licensed physicians through async consultations, live video, and integrated prescription management.',
    category: 'Healthtech',
    techStack: ['Next.js', 'WebRTC', 'PostgreSQL', 'Stripe', 'FHIR API'],
    featured: false,
    status: 'completed',
    year: 2023,
    problem:
      'Patients in rural counties faced 2–4 hour round trips for routine consultations. Physician availability was concentrated in urban centers. 35% of patients in the target region delayed care due to access barriers, resulting in worse outcomes and higher downstream costs.',
    solution:
      'CareConnect offers three consultation modes: async (patient submits symptoms and photos; physician responds within 4 hours), scheduled live video via WebRTC, and urgent care triage with live queue management. Prescription requests route to partner pharmacies via a FHIR-compliant API. Stripe handles co-pay billing with HSA/FSA support.',
    results:
      '8,000+ consultations completed in the first 6 months. 92% patient retention rate after first visit. Average wait time for a routine consultation: 3.2 hours vs. the regional average of 18 days for an in-person appointment.',
    tags: ['Telemedicine', 'Rural Health', 'HIPAA', 'Prescriptions'],
    liveUrl: null,
    githubUrl: null,
    coverImage: null,
  },
];

async function main() {
  console.log('Seeding projects...');

  await db.delete(projects);

  const inserted = await db.insert(projects).values(seedProjects).returning({ id: projects.id, title: projects.title });

  console.log(`✓ Seeded ${inserted.length} projects:`);
  inserted.forEach(({ id, title }) => console.log(`  [${id}] ${title}`));
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
