export const serviceAreas = [
  {
    id: "product-design-engineering",
    name: "Product design & engineering",
    introduction:
      "Before another screen or another feature, get clear on the product. We bring product management, design, and engineering together to make the important decisions early and carry them into the build.",
    scope: [
      "Product discovery, requirements, and scope",
      "User journeys, UX/UI, and interactive prototypes",
      "Design systems and reusable interface patterns",
      "Technical architecture and implementation planning",
    ],
    outputs: [
      "A prioritised product direction",
      "Considered designs and user flows",
      "A shared plan for design and engineering",
    ],
  },
  {
    id: "web-mobile-ai",
    name: "Web, mobile & AI products",
    introduction:
      "A useful product needs the experience and the systems underneath to work together. Our frontend, backend, and mobile developers build the interfaces, data flows, and integrations around the people using them.",
    scope: [
      "Custom websites, web apps, and client portals",
      "iOS and Android application development",
      "AI features, model integrations, and workflows",
      "APIs, authentication, databases, and backend services",
    ],
    outputs: [
      "Working features across the agreed platforms",
      "Connected interfaces and backend services",
      "Code and implementation documentation",
    ],
  },
  {
    id: "prototype-to-production",
    name: "Prototype to production",
    introduction:
      "A convincing demo is a starting point, not a finished product. Bring the MVP, prototype, or AI-generated build. We work through what is real, what is missing, and what needs strengthening before people depend on it.",
    scope: [
      "Codebase assessment and architecture improvements",
      "Completing features and connecting backend logic",
      "Data modelling, permissions, and error handling",
      "Production configuration and critical-flow testing",
    ],
    outputs: [
      "A clear picture of the gaps and priorities",
      "Completed, tested product journeys",
      "A build prepared for the agreed release scope",
    ],
  },
  {
    id: "rescue-migrations",
    name: "Product rescue & migrations",
    introduction:
      "You should not have to throw everything away to move forward. We take over unfinished builds, investigate difficult problems, and plan changes around the parts of your product that already work.",
    scope: [
      "Debugging, refactoring, and performance investigation",
      "Redesigns and improvements to existing features",
      "Website, application, and hosting migrations",
      "Backend changes and carefully planned database migrations",
    ],
    outputs: [
      "An assessment and an agreed improvement plan",
      "Targeted fixes or a scoped rebuild",
      "Migration checks, handover, and rollback planning",
    ],
  },
  {
    id: "quality-launch",
    name: "Quality & launch",
    introduction:
      "The last stretch deserves the same care as the first. We test the important journeys, polish the details, and prepare the product and its infrastructure for release.",
    scope: [
      "QA, functional testing, and integration checks",
      "Accessibility, responsive behaviour, and performance",
      "Production deployment, domains, and configuration",
      "App Store and Google Play submission support",
    ],
    outputs: [
      "A prioritised issue list and agreed fixes",
      "Release preparation and deployment notes",
      "Store submission preparation and review follow-up",
    ],
    note: "Store approval is decided by Apple and Google. Submission support is not a guarantee of approval.",
  },
] as const;

export const servicesDescription =
  "Product management, design, web and mobile development, AI products, app rescue, migrations, QA, and launch support from PromDevs. Start fresh or improve an existing product.";
