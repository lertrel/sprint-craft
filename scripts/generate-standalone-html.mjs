import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const standaloneDir = resolve(root, "standalone");

const srcHtmlPath = resolve(root, "index.html");
const outHtmlPath = resolve(standaloneDir, "index.html");
const outSinglePath = resolve(standaloneDir, "sprint-craft.single.html");
const bundlePath = resolve(standaloneDir, "sprint-craft.js");

const srcHtml = await readFile(srcHtmlPath, "utf8");

// Replace the Vite dev entry with the standalone IIFE bundle.
const htmlWithStandaloneScript = srcHtml.replace(
  /<script\s+type="module"\s+src="\/src\/main\.ts"><\/script>/,
  '<script src="./sprint-craft.js"></script>'
);

await writeFile(outHtmlPath, htmlWithStandaloneScript, "utf8");

// Create a true single-file HTML by inlining the JS bundle.
const bundle = await readFile(bundlePath, "utf8");
const singleFileHtml = htmlWithStandaloneScript.replace(
  '<script src="./sprint-craft.js"></script>',
  `<script>\n${bundle}\n</script>`
);

await writeFile(outSinglePath, singleFileHtml, "utf8");

console.log(`Wrote: ${outHtmlPath}`);
console.log(`Wrote: ${outSinglePath}`);

