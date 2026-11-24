// Genera apple-touch-icon.png (el iPhone no admite SVG) a partir de icon.svg
import { chromium } from "playwright-core"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const b = await chromium.launch({ channel: "chromium" }), p = await b.newPage({ viewport: { width: 180, height: 180 } });
await p.setContent(`<style>body{margin:0}svg{display:block;width:180px;height:180px}</style>${fs.readFileSync(new URL("../icon.svg", import.meta.url))}`);
await p.screenshot({ path: fileURLToPath(new URL("../apple-touch-icon.png", import.meta.url)) }); await b.close();
