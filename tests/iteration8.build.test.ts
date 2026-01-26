import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, "..", "scripts", "generate-standalone-html.mjs");

const stampPattern = /(\d{2})-(\d{2})-(\d{4}):(\d{2})\.(\d{2})\.(\d{2})/;

function extractStamp(html: string): string {
  const match = html.match(/id="buildStamp"[^>]*>([^<]+)</);
  if (!match) {
    throw new Error("Build stamp not found in HTML output.");
  }
  return match[1];
}

function stampToUtcMs(stamp: string): number {
  const match = stamp.match(stampPattern);
  if (!match) {
    throw new Error(`Invalid build stamp format: ${stamp}`);
  }
  const [, day, month, year, hour, minute, second] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

describe("Iteration 8: standalone build stamp (unit)", () => {
  it("inserts a UTC timestamp into standalone outputs", async () => {
    const tempDir = await mkdtemp(resolve(tmpdir(), "sprint-craft-build-"));
    try {
      const standaloneDir = resolve(tempDir, "standalone");
      await mkdir(standaloneDir, { recursive: true });

      const srcHtml = `<!doctype html>
<html>
  <body>
    <div id="app">
      <div id="hud">
        <div id="hotbar"></div>
      </div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`;

      await writeFile(resolve(tempDir, "index.html"), srcHtml, "utf8");
      await writeFile(resolve(standaloneDir, "sprint-craft.js"), "console.log('bundle');", "utf8");

      const before = Date.now();
      await execFileAsync(process.execPath, [scriptPath], {
        cwd: tempDir,
        env: { ...process.env, TZ: "Pacific/Honolulu" }
      });
      const after = Date.now();

      const outHtml = await readFile(resolve(standaloneDir, "index.html"), "utf8");
      const singleHtml = await readFile(
        resolve(standaloneDir, "sprint-craft.single.html"),
        "utf8"
      );

      const stamp = extractStamp(outHtml);
      const singleStamp = extractStamp(singleHtml);
      expect(stamp).toBe(singleStamp);
      expect(stamp).toMatch(stampPattern);

      const stampMs = stampToUtcMs(stamp);
      expect(stampMs).toBeGreaterThanOrEqual(before - 5000);
      expect(stampMs).toBeLessThanOrEqual(after + 5000);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
