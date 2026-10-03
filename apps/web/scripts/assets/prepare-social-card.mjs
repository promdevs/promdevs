import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dataUrl = async (file, type) =>
  `data:${type};base64,${(await readFile(resolve(root, file))).toString("base64")}`;

const [displayFont, bodyFont, logo, stipple] = await Promise.all([
  dataUrl(
    "node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
    "font/woff2",
  ),
  dataUrl(
    "node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
    "font/woff2",
  ),
  dataUrl("public/images/nobg-logo-white.png", "image/png"),
  dataUrl("public/images/stipple.svg", "image/svg+xml"),
]);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>PromDevs social card</title>
  <style>
    @font-face { font-family: Display; src: url("${displayFont}") format("woff2"); font-weight: 300 700; }
    @font-face { font-family: Body; src: url("${bodyFont}") format("woff2"); font-weight: 100 1000; }
    * { box-sizing: border-box; }
    html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
    body { font-family: Body, sans-serif; background: #0c0c0c; color: #f5f5f5; }
    .card { position: relative; width: 1200px; height: 630px; padding: 48px 64px; display: flex; flex-direction: column; }
    .texture { position: absolute; inset: 0; background: url("${stipple}") repeat; background-size: 160px 160px; filter: invert(1); opacity: .14; }
    header, main, footer { position: relative; }
    header { display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 9px; font-family: Display, sans-serif; font-size: 34px; font-weight: 600; letter-spacing: -2px; }
    .brand img { width: 46px; height: 46px; object-fit: contain; }
    .brand b { color: #2563eb; font-weight: 600; }
    .eyebrow { color: #a6a6a6; font-size: 11px; font-weight: 600; letter-spacing: 2.7px; }
    main { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; padding-bottom: 12px; }
    h1 { display: flex; flex-direction: column; align-items: center; margin: 0; font-family: Display, sans-serif; font-size: 88px; font-weight: 500; line-height: 1.12; letter-spacing: -5.8px; }
    h1 em { font-family: Georgia, "Times New Roman", serif; font-size: 104px; font-weight: 400; letter-spacing: -4px; line-height: 1.2; }
    .description { margin: 27px 0 0; font-size: 21px; line-height: 1.5; color: #a6a6a6; letter-spacing: -.35px; }
    footer { display: flex; align-items: center; justify-content: space-between; padding-top: 23px; border-top: 1px solid #333; }
    .capabilities { display: flex; align-items: center; gap: 19px; color: #b6b6b6; font-size: 12px; font-weight: 500; letter-spacing: 1.8px; }
    .dot { width: 4px; height: 4px; border-radius: 50%; background: #2563eb; }
    .url { display: flex; align-items: center; gap: 12px; font-size: 15px; letter-spacing: -.25px; }
    .url svg { width: 16px; height: 16px; color: #2563eb; }
  </style>
</head>
<body>
  <article class="card">
    <div class="texture" aria-hidden="true"></div>
    <header>
      <div class="brand"><img src="${logo}" alt=""><span>prom<b>devs</b></span></div>
      <span class="eyebrow">DIGITAL PRODUCT STUDIO</span>
    </header>
    <main>
      <h1><span>Your next big idea.</span><em>Beautifully built.</em></h1>
      <p class="description">From rough ideas to production-ready products.</p>
    </main>
    <footer>
      <div class="capabilities"><span>WEB APPS</span><i class="dot"></i><span>MOBILE APPS</span><i class="dot"></i><span>AI PRODUCTS</span></div>
      <div class="url">promdevs.com<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </footer>
  </article>
</body>
</html>`;

await mkdir(resolve(root, "../../output/social"), { recursive: true });
await writeFile(resolve(root, "../../output/social/preview.html"), html);
console.log("Prepared output/social/preview.html (1200 x 630).");
console.log("Render at device scale factor 1 after document.fonts.ready.");
console.log("Export PNG to apps/web/app/opengraph-image.png and apps/web/app/twitter-image.png.");
