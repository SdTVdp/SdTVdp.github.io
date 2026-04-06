import fs from "node:fs/promises";
import path from "node:path";

const target = path.join(process.cwd(), "dist");

try {
  await fs.rm(target, { recursive: true, force: true });
} catch (error) {
  console.warn(`[clean] skipped dist cleanup: ${error instanceof Error ? error.message : String(error)}`);
}
