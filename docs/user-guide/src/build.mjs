// Builds the Bangla user guide PDF from the chapter files:
//   cd docs/user-guide/src && cat head.html ch1-start.html ch2-pilgrims.html ch3-ops.html ch4-admin.html > guide.html && node build.mjs guide.html ../hajj-tracking-user-guide-bn.pdf
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(fileURLToPath(new URL("../../../package.json", import.meta.url)))("@playwright/test");
const [src, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("file://" + path.resolve(src), { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const missing = await p.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")));
if (missing.length) console.log("MISSING IMAGES:", missing);
await p.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font-size:8px;color:#5e7471;padding:0 14mm;display:flex;justify-content:space-between;font-family:'Kohinoor Bangla','Bangla Sangam MN',sans-serif"><span>হজ ট্র্যাকিং · ব্যবহার নির্দেশিকা</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" },
});
await b.close();
console.log("ok", out);
