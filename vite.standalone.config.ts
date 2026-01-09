import { defineConfig } from "vite";

// Produces a "download and open in browser" bundle:
// - `standalone/index.html`
// - `standalone/sprint-craft.js` (IIFE, self-contained)
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "standalone",
    emptyOutDir: true,
    lib: {
      entry: "src/standalone-entry.ts",
      name: "SprintCraft",
      formats: ["iife"],
      fileName: () => "sprint-craft.js"
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});

