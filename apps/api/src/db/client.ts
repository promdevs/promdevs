import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { HttpError } from "../errors.js";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new HttpError(503, "Project storage is not configured.");
  return drizzle(neon(url));
}
