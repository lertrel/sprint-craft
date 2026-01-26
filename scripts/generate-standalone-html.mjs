import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const standaloneDir = resolve(root, "standalone");

const srcHtmlPath = resolve(root, "index.html");
const outHtmlPath = resolve(standaloneDir, "index.html");
const outSinglePath = resolve(standaloneDir, "sprint-craft.single.html");
const bundlePath = resolve(standaloneDir, "sprint-craft.js");

const srcHtml = await readFile(srcHtmlPath, "utf8");

const pad2 = (value) => String(value).padStart(2, "0");
const now = new Date();
const buildStamp = `${pad2(now.getUTCDate())}-${pad2(now.getUTCMonth() + 1)}-${now.getUTCFullYear()}:${pad2(
  now.getUTCHours()
)}.${pad2(now.getUTCMinutes())}.${pad2(now.getUTCSeconds())}`;
const buildStampHtml = `<div id="buildStamp" style="position:absolute;right:8px;bottom:8px;font-size:10px;line-height:1;color:rgba(255,255,255,0.7);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;pointer-events:none;">${buildStamp}</div>`;

// Replace the Vite dev entry with the standalone IIFE bundle.
const htmlWithStandaloneScript = srcHtml.replace(
  /<script\s+type="module"\s+src="\/src\/main\.ts"><\/script>/,
  '<script src="./sprint-craft.js"></script>'
);

const htmlWithBuildStamp = htmlWithStandaloneScript.replace(
  '<div id="hotbar"></div>',
  `<div id="hotbar"></div>\n        ${buildStampHtml}`
);

await writeFile(outHtmlPath, htmlWithBuildStamp, "utf8");

// Create a true single-file HTML by inlining the JS bundle.
const bundle = await readFile(bundlePath, "utf8");
const singleFileHtml = htmlWithBuildStamp.replace(
  '<script src="./sprint-craft.js"></script>',
  `<script>\n${bundle}\n</script>`
);

await writeFile(outSinglePath, singleFileHtml, "utf8");

console.log(`Wrote: ${outHtmlPath}`);
console.log(`Wrote: ${outSinglePath}`);

