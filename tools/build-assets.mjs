import { copyFile, cp, mkdir } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const distRoot = path.join(projectRoot, "dist");

const assetTargets = [
  [path.join(sourceRoot, "system.json"), path.join(distRoot, "system.json")],
  [path.join(sourceRoot, "templates"), path.join(distRoot, "templates")],
  [path.join(sourceRoot, "styles"), path.join(distRoot, "styles")],
  [path.join(sourceRoot, "lang"), path.join(distRoot, "lang")],
  [path.join(sourceRoot, "packs"), path.join(distRoot, "packs")]
];

async function copyAssets() {
  await mkdir(distRoot, { recursive: true });
  await copyFile(assetTargets[0][0], assetTargets[0][1]);

  for (const [sourcePath, targetPath] of assetTargets.slice(1)) {
    await cp(sourcePath, targetPath, { recursive: true, force: true });
  }
}

async function runOnce() {
  await copyAssets();
  console.log("Copied Foundry runtime assets to dist.");
}

async function runWatch() {
  await runOnce();

  let timer;
  const debounce = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await runOnce();
      } catch (error) {
        console.error(error);
      }
    }, 100);
  };

  fs.watch(sourceRoot, { recursive: true }, debounce);
  console.log("Watching asset sources for changes.");
}

if (process.argv.includes("--watch")) {
  await runWatch();
} else {
  await runOnce();
}
