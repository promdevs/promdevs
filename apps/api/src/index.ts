import { config } from "./config.js";
import { createApiServer } from "./server.js";
import { projectStore } from "./projects.js";
import { sendContactEmail } from "./email/resend.js";
import { databaseAuthStore } from "./access-control/auth-store.js";
import { databaseAccountsStore } from "./access-control/accounts-store.js";
import { databaseInvitationsStore } from "./access-control/invitations-store.js";
import { invitationMailer } from "./email/invitations.js";

const server = createApiServer({
  ...config,
  store: projectStore,
  authStore: databaseAuthStore,
  accountsStore: databaseAccountsStore,
  invitationsStore: databaseInvitationsStore,
  invitationMailer,
  sendEmail: sendContactEmail,
});
server.listen(config.port, config.host, () => {
  console.info(
    `PromDevs API listening at http://${config.host}:${config.port}`,
  );
  if (!process.env.DATABASE_URL)
    console.info(
      "Database authentication and project storage require DATABASE_URL.",
    );
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
