export type Project = {
  title: string;
  summary: string;
  stack: string[];
};

export const projects: Project[] = [
  {
    title: "Ops Dashboard",
    summary: "Live operations dashboard with role-based analytics and alerts.",
    stack: ["Next.js", "TypeScript", "PostgreSQL"]
  },
  {
    title: "Commerce API Hub",
    summary: "Unified API integrations across payments, inventory, and shipping.",
    stack: ["Node.js", "REST", "Redis"]
  },
  {
    title: "Client Portal",
    summary: "Secure customer portal with document workflows and messaging.",
    stack: ["React", "Prisma", "Auth"]
  },
  {
    title: "Performance Sprint",
    summary: "Core Web Vitals optimization and UI system refresh for growth.",
    stack: ["Lighthouse", "Tailwind", "A/B Testing"]
  }
];
