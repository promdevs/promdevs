const labels: Record<string, string> = {
  product_design: "Product design",
  frontend_development: "Frontend development",
  backend_development: "Backend development",
  mobile_development: "Mobile development",
  ai_development: "AI development",
  app_rescue: "App rescue",
  migrations: "Migrations",
  qa_performance: "QA & performance",
  deployment: "Deployment",
};

export function workServiceLabel(service: string) {
  return labels[service] ?? service.replaceAll("_", " ");
}
