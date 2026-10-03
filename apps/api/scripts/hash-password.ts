import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "../src/auth.js";

if (!process.stdin.isTTY)
  throw new Error(
    "Run this command in an interactive terminal; passwords must not be command-line arguments.",
  );
let muted = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) process.stdout.write(chunk);
    done();
  },
});
const terminal = createInterface({
  input: process.stdin,
  output,
  terminal: true,
});
process.stdout.write("New admin password (hidden, at least 16 characters): ");
muted = true;
const password = await terminal.question("");
muted = false;
process.stdout.write("\n");
terminal.close();
if (password.length < 16 || password.length > 1024)
  throw new Error("Use a password between 16 and 1024 characters.");
console.log(
  "Set ADMIN_PASSWORD_HASH on the API (use single quotes in .env files):",
);
console.log(`ADMIN_PASSWORD_HASH='${await hashPassword(password)}'`);
