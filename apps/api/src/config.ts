import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Local compatibility only. Production receives API secrets through Coolify.
if (process.env.NODE_ENV !== "production") {
  loadEnv({ path: resolve(process.cwd(), ".env.local"), quiet: true });
  loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true });
  loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true });
}

export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || "127.0.0.1",
  adminOrigin: process.env.ADMIN_ORIGIN || "http://localhost:5173",
  secureCookies: process.env.NODE_ENV === "production",
  trustProxy: process.env.TRUST_PROXY === "true",
};
