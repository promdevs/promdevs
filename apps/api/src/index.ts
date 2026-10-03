import { config } from "./config.js";
import { createApiServer } from "./server.js";
import { projectStore } from "./projects.js";
import { sendContactEmail } from "./email/resend.js";

const server = createApiServer({
  ...config,
  store: projectStore,
  sendEmail: sendContactEmail,
});
server.listen(config.port, config.host, () => {
  console.info(
    `PromDevs API listening at http://${config.host}:${config.port}`,
  );
  if (!config.adminEmail || !config.passwordHash)
    console.info(
      "Admin login is disabled until API credentials are configured.",
    );
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
