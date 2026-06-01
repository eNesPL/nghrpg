import { cp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const defaultTargetRoot = "C:\\Users\\kliza\\AppData\\Local\\FoundryVTT\\Data\\systems\\nghrpg";
const targetRoot = process.env.NGH_FOUNDRY_TARGET?.trim() || defaultTargetRoot;

const runtimeEntries = ["system.json", "scripts", "templates", "styles", "lang", "packs"];

const sourceSystemManifest = path.join(projectRoot, "src", "system.json");
const distSystemManifest = path.join(distRoot, "system.json");

const bumpPatchVersion = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) {
    throw new Error(`Invalid system version format: ${version}. Expected MAJOR.MINOR.PATCH`);
  }

  const major = Number.parseInt(match[1], 10);
  const minor = Number.parseInt(match[2], 10);
  const patch = Number.parseInt(match[3], 10) + 1;
  return `${major}.${minor}.${patch}`;
};

const bumpSystemManifestVersions = async () => {
  const sourceManifestRaw = await readFile(sourceSystemManifest, "utf8");
  const sourceManifest = JSON.parse(sourceManifestRaw);
  const nextVersion = bumpPatchVersion(sourceManifest.version ?? "0.0.0");

  sourceManifest.version = nextVersion;
  await writeFile(sourceSystemManifest, `${JSON.stringify(sourceManifest, null, 2)}\n`, "utf8");
  await writeFile(distSystemManifest, `${JSON.stringify(sourceManifest, null, 2)}\n`, "utf8");

  return nextVersion;
};

const getRealPathOrNull = async (targetPath) => {
  try {
    return await realpath(targetPath);
  } catch {
    return null;
  }
};

const ensureRuntimeExists = async () => {
  for (const entry of runtimeEntries) {
    const entryPath = path.join(distRoot, entry);
    const resolved = await getRealPathOrNull(entryPath);
    if (!resolved) {
      throw new Error(`Runtime entry is missing: ${entryPath}. Run the build first.`);
    }
  }
};

const syncEntry = async (entry) => {
  const sourcePath = path.join(distRoot, entry);
  const targetPath = path.join(targetRoot, entry);
  await rm(targetPath, { recursive: true, force: true });
  await cp(sourcePath, targetPath, { recursive: true, force: true });
};

const syncToFoundry = async () => {
  const syncedVersion = await bumpSystemManifestVersions();
  await ensureRuntimeExists();

  const sourceRootReal = await realpath(distRoot);
  const targetRootReal = await getRealPathOrNull(targetRoot);

  if (targetRootReal && targetRootReal === sourceRootReal) {
    console.log(`Foundry target already points at this workspace: ${targetRootReal}`);
    console.log(`NGH version: ${syncedVersion}`);
    console.log("No file copy was needed.");
    return;
  }

  await mkdir(targetRoot, { recursive: true });

  for (const entry of runtimeEntries) {
    await syncEntry(entry);
  }

  console.log(`Synced Foundry runtime files to ${targetRoot}`);
  console.log(`NGH version: ${syncedVersion}`);
};

await syncToFoundry();
