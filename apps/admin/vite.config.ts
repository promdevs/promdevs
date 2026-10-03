import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "API_");
  const proxy = { "/api": { target: env.API_PROXY_TARGET || "http://127.0.0.1:4000", changeOrigin: true } };
  return { plugins: [react()], server: { proxy }, preview: { proxy } };
});
