import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("../dist/", import.meta.url);
const limits = {
  ".js": 650 * 1024,
  ".css": 120 * 1024,
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(root.pathname);
let failed = false;
for (const file of files) {
  const extension = extname(file);
  const limit = limits[extension];
  if (!limit) continue;
  const { size } = await stat(file);
  const relative = file.replace(root.pathname, "dist/");
  console.log(`[bundle] ${relative}: ${(size / 1024).toFixed(1)} KiB / ${(limit / 1024).toFixed(0)} KiB`);
  if (size > limit) {
    failed = true;
    console.error(`[bundle] budget exceeded: ${relative}`);
  }
}

if (failed) process.exit(1);
