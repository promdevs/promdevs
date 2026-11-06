export const expertisePages = {
  replit: {
    name: "Replit",
    logo: "/assets/tools/replit.svg",
    certified: true,
    title: "Replit Developers & Development Services",
    description:
      "Certified Replit expertise from PromDevs. Product design, full-stack development, app improvements, integrations, debugging, and launch support.",
    headline: "Built on Replit.",
    emphasis: "Ready for what’s next.",
    introduction:
      "A first idea, an app already in use, or a build that has stopped moving. We bring product design and full-stack engineering to Replit projects, from the interface to the database and deployment.",
    serviceHeading: "More than getting it to run.",
    serviceIntro:
      "We look at the whole product: what people need, what the code is doing, and what has to work when it goes live.",
    services: [
      {
        id: "build",
        label: "Starting fresh",
        title: "Build the right product.",
        description:
          "Turn a product idea into a considered Replit application, with design and engineering working together from the start.",
        deliverables: [
          "Product scope, user journeys, and interface design",
          "Frontend, backend, authentication, and data modelling",
          "AI features and practical API integrations",
        ],
      },
      {
        id: "improve",
        label: "Already building",
        title: "Make the existing build better.",
        description:
          "Find the cause of the problem, not just another workaround. Improve a Replit app without discarding the parts that work.",
        deliverables: [
          "Debugging, refactoring, and unfinished features",
          "Database issues, permissions, and backend logic",
          "Responsive UI, accessibility, and performance",
        ],
      },
      {
        id: "launch",
        label: "Preparing to launch",
        title: "Get the details ready.",
        description:
          "Bring the runtime, configuration, and key user journeys into focus before putting the product in front of people.",
        deliverables: [
          "Publishing approach, environment variables, and domains",
          "Integration checks and critical-flow testing",
          "A practical handover and deployment notes",
        ],
      },
    ],
    fitIntro:
      "Replit can be a useful home for custom applications and AI-assisted development. The right deployment and data decisions still depend on how your product works.",
    goodFit: [
      "An MVP or custom app with real backend logic",
      "AI tools, APIs, dashboards, and internal products",
      "An existing Replit project that needs experienced hands",
    ],
    assessFirst: [
      "Long-running tasks and specific runtime requirements",
      "Data storage, access rules, and ongoing infrastructure costs",
      "A move to another host or a more specialised architecture",
    ],
    docs: {
      title: "Replit’s publishing documentation",
      href: "https://docs.replit.com/learn/projects-and-artifacts/replit-deployments",
    },
    faqs: [
      {
        question: "Can you build a new Replit app from an idea?",
        answer:
          "Yes. We can help define the product, design the experience, and build the frontend, backend, and integrations. You do not need to arrive with a working prototype.",
      },
      {
        question: "Can you take over an app built with Replit Agent?",
        answer:
          "Yes. We first review the current code, data, integrations, and intended behaviour. Then we agree what to keep, what needs attention, and which changes matter most.",
      },
      {
        question: "Can you fix database, API, or deployment problems?",
        answer:
          "Those are part of our engineering work. We investigate the specific issue and its dependencies, then scope the fix and testing. We do not promise a solution before seeing the system.",
      },
      {
        question: "Does the project have to stay on Replit?",
        answer:
          "No. We can assess staying on Replit or moving elsewhere. Migration may involve code, data, secrets, storage, background work, and deployment changes; it is not always just a repository transfer.",
      },
      {
        question: "What will it cost, and how long will it take?",
        answer:
          "That depends on the starting point, the scope, and the risks. Share the idea or current project, and we will discuss priorities and milestones before agreeing a proposal. Platform subscriptions and usage costs are separate from our work.",
      },
    ],
  },
  lovable: {
    name: "Lovable",
    logo: "/assets/tools/lovable.svg",
    certified: true,
    title: "Lovable Design & Development Services",
    description:
      "Certified Lovable expertise from PromDevs. New app builds, product design, prototype completion, backend integrations, improvements, and launch preparation.",
    headline: "Start with Lovable.",
    emphasis: "Finish with intention.",
    introduction:
      "Build something new, or turn the app you have started into a more complete product. We bring product thinking, interface design, and engineering to Lovable, beyond the first convincing screen.",
    serviceHeading: "From promising to properly considered.",
    serviceIntro:
      "The screens are part of the story. We also work on the user journeys, data, permissions, integrations, and states that make the experience hold together.",
    services: [
      {
        id: "build",
        label: "Starting fresh",
        title: "Give the idea a clear shape.",
        description:
          "Plan and build a Lovable product around the people using it, rather than a collection of disconnected screens.",
        deliverables: [
          "Product direction, UX flows, and interface design",
          "Responsive pages and reusable UI patterns",
          "The data and integrations needed for the agreed scope",
        ],
      },
      {
        id: "improve",
        label: "Already building",
        title: "Complete the experience.",
        description:
          "Take an existing Lovable app further with the missing functionality, visual consistency, and engineering attention it needs.",
        deliverables: [
          "Unfinished features, confusing flows, and UI refinements",
          "Authentication, permissions, and connected backend logic",
          "Loading, empty, error, and success states",
        ],
      },
      {
        id: "launch",
        label: "Preparing to launch",
        title: "Make the next step deliberate.",
        description:
          "Review what is ready, resolve the gaps, and prepare the product for release or a more developer-led workflow.",
        deliverables: [
          "Key-flow testing, accessibility, and performance checks",
          "Publishing setup, domains, and environment configuration",
          "Git workflow, handover, and portability planning",
        ],
      },
    ],
    fitIntro:
      "Lovable is useful for building and iterating on app interfaces with connected functionality. We help decide where its workflow fits, and where the product needs more deliberate engineering.",
    goodFit: [
      "A new product that needs design and a working implementation",
      "A prototype that looks promising but needs completing",
      "A client portal, internal tool, or app with connected workflows",
    ],
    assessFirst: [
      "Complex permissions, data ownership, or compliance requirements",
      "Backend behaviour that needs investigation rather than another prompt",
      "Code, database, and hosting dependencies before a migration",
    ],
    docs: {
      title: "Lovable’s GitHub and code portability documentation",
      href: "https://docs.lovable.dev/integrations/github",
    },
    faqs: [
      {
        question: "Do you only fix existing Lovable apps?",
        answer:
          "No. We can start with your idea, work through the product direction and design, and build a new app. We also improve, complete, and rebuild parts of existing Lovable projects.",
      },
      {
        question: "Can you make my app feel less like a template?",
        answer:
          "Yes. We can revisit the user journeys, typography, layout, components, and interaction details so the product feels coherent and appropriate to your brand, not simply restyled.",
      },
      {
        question: "Can you help with authentication and integrations?",
        answer:
          "Yes. We review the existing backend and required services, then scope the authentication, permissions, data flows, and integrations around your product. The right approach depends on the current setup and access available.",
      },
      {
        question: "Can developers work with the Lovable codebase?",
        answer:
          "Lovable supports exporting and syncing project code through its Git integrations. We can help introduce a developer workflow. Code portability does not automatically move live data, secrets, or managed backend services, so we review those separately.",
      },
      {
        question: "Can you estimate from a project link?",
        answer:
          "A link is a useful start, along with the goals and the problems you have noticed. We may need access or a walkthrough to understand the full scope before proposing costs and milestones. Platform charges remain separate.",
      },
    ],
  },
  base44: {
    name: "Base44",
    logo: "/assets/tools/base44.svg",
    certified: false,
    title: "Base44 App Design & Development Services",
    description:
      "Base44 app development from PromDevs. Product design, business workflows, permissions, integrations, existing app improvements, and launch preparation.",
    headline: "Built with Base44.",
    emphasis: "Shaped around your business.",
    introduction:
      "Make a new idea useful, or make an existing Base44 app work better for the people relying on it. We shape the experience, connect the workflows, and bring design and technical care to the details.",
    serviceHeading: "An app that fits the way you work.",
    serviceIntro:
      "We work across the interface, the data, and the business rules, so the product is more than a set of generated pages.",
    services: [
      {
        id: "build",
        label: "Starting fresh",
        title: "Shape a useful application.",
        description:
          "Work from the real business need to a clear product structure and a considered Base44 experience.",
        deliverables: [
          "Product requirements, user journeys, and UX/UI",
          "Data structure, screens, and core application flows",
          "Internal tools, portals, and business applications",
        ],
      },
      {
        id: "improve",
        label: "Already building",
        title: "Connect the moving parts.",
        description:
          "Improve the build you already have, with attention to how data, permissions, and integrations behave together.",
        deliverables: [
          "Existing feature fixes and workflow improvements",
          "Access roles, data permissions, and validation",
          "APIs, backend functions, and supported integrations",
        ],
      },
      {
        id: "launch",
        label: "Preparing to launch",
        title: "Prepare it for everyday use.",
        description:
          "Review the experience and its dependencies before rollout, with a clear picture of the work still needed.",
        deliverables: [
          "Key-flow testing and responsive interface refinements",
          "Publishing, domain, and account configuration review",
          "Handover, operational notes, and migration assessment",
        ],
      },
    ],
    fitIntro:
      "Base44 brings app-building tools and managed services into one platform. We help align that setup with your workflows, users, and longer-term needs.",
    goodFit: [
      "Business applications, portals, and internal workflows",
      "An existing Base44 app that needs clearer design or logic",
      "Connected processes involving data, users, and integrations",
    ],
    assessFirst: [
      "Detailed access rules and sensitive-data requirements",
      "External services, integration availability, and plan limits",
      "Moving code and replacing managed services outside the platform",
    ],
    docs: {
      title: "Base44’s official platform documentation",
      href: "https://docs.base44.com/",
    },
    faqs: [
      {
        question: "Can you build a Base44 app from scratch?",
        answer:
          "Yes. We start with the business need, the people using the app, and the workflows involved. Then we scope the product design, data structure, and implementation around those requirements.",
      },
      {
        question: "Can you improve an existing Base44 build?",
        answer:
          "Yes. We can review the current experience, finish features, improve workflows, and investigate issues with data or permissions. We keep what works and agree what needs changing.",
      },
      {
        question: "Can you work on integrations and access rules?",
        answer:
          "Yes, within the capabilities of your app and account. Base44 provides managed data, authentication, integrations, and backend tooling. We assess the requirements and current configuration before committing to a particular integration or permission model.",
      },
      {
        question: "Can my app move outside Base44 later?",
        answer:
          "We can assess that with you. Code, live data, authentication, and managed backend services have different dependencies. Exporting code alone should not be treated as a complete migration; we scope what needs transferring, adapting, or replacing.",
      },
      {
        question: "What do you need to review my project?",
        answer:
          "A product link or walkthrough, what the app should do, the current problems, and any important integrations or access requirements. We will agree appropriate access separately. Do not send passwords, API keys, or sensitive production data through the enquiry form.",
      },
    ],
  },
} as const;

export type ExpertiseKey = keyof typeof expertisePages;
export const expertiseKeys = Object.keys(expertisePages) as ExpertiseKey[];
export type ExpertisePageData = (typeof expertisePages)[ExpertiseKey];
export function getExpertisePage(value: string): ExpertisePageData | null {
  return Object.hasOwn(expertisePages, value)
    ? expertisePages[value as ExpertiseKey]
    : null;
}

export const expertiseProcess = [
  {
    title: "Understand",
    description:
      "Your goals, the current build, and the constraints. We establish what the product actually needs.",
    output: "A clear starting point",
  },
  {
    title: "Shape",
    description:
      "Work through the scope, user experience, and technical decisions before committing to the implementation.",
    output: "Agreed priorities",
  },
  {
    title: "Build & refine",
    description:
      "Designers and engineers work through the agreed scope, with visible progress and considered trade-offs.",
    output: "A working product",
  },
  {
    title: "Test & launch",
    description:
      "Check the important journeys, prepare the release, and document what you need to know afterwards.",
    output: "A practical handover",
  },
] as const;
