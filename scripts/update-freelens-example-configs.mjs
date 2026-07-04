#!/usr/bin/env node

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const owner = "freelensapp";
const repo = "freelens-example-extension";
const defaultRef = "main";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const pruneWorkflows = args.has("--prune-workflows");

const ref = getOptionValue("--ref") ?? process.env.FREELENS_EXAMPLE_REF ?? defaultRef;
const excludedWorkflowFiles = new Set(["claude-task.yaml", "claude.yaml", "npm-audit.yaml", "osv-scanner.yaml"]);

const fileMappings = [
  [".trunk/trunk.yaml", ".trunk/trunk.yaml"],
  ["biome.jsonc", "biome.jsonc"],
  [".renovaterc.json5", ".renovaterc.json5"],
  ["tsconfig.json", "tsconfig.json"],
  ["knip.jsonc", "knip.jsonc"],
  ["electron.vite.config.js", "electron.vite.config.ts"],
  ["vitest.config.ts", "vitest.config.ts"],
];

const updated = [];
const unchanged = [];
const removed = [];

if (args.has("--help")) {
  printHelp();
  process.exit(0);
}

const workflows = await listWorkflowFiles();

for (const workflow of workflows) {
  fileMappings.push([workflow, workflow]);
}

for (const [sourcePath, targetPath] of fileMappings) {
  await updateFile(sourcePath, targetPath);
}

if (pruneWorkflows) {
  await pruneLocalWorkflows(workflows);
}

await updatePackageJson();

printSummary();

function getOptionValue(name) {
  const option = process.argv.slice(2).find((argument) => argument.startsWith(`${name}=`));

  return option?.slice(name.length + 1);
}

function printHelp() {
  console.log(`Usage: node scripts/update-freelens-example-configs.mjs [options]

Updates selected config files from ${owner}/${repo}.

Options:
  --dry-run            Show what would change without writing files.
  --prune-workflows    Remove local .github/workflows files missing upstream.
  --ref=<ref>          Git ref, branch, or tag to fetch. Defaults to ${defaultRef}.
  --help               Show this help.
`);
}

async function listWorkflowFiles() {
  const entries = await fetchJson(githubApiUrl(".github/workflows"));

  return entries
    .filter((entry) => entry.type === "file" && /\.ya?ml$/u.test(entry.name) && !excludedWorkflowFiles.has(entry.name))
    .map((entry) => entry.path)
    .sort();
}

async function pruneLocalWorkflows(upstreamWorkflows) {
  const workflowDir = join(root, ".github", "workflows");
  const upstream = new Set(upstreamWorkflows);
  let localEntries = [];

  try {
    localEntries = await readdir(workflowDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const entry of localEntries) {
    if (!entry.isFile() || !/\.ya?ml$/u.test(entry.name)) {
      continue;
    }

    const targetPath = `.github/workflows/${entry.name}`;

    if (!upstream.has(targetPath)) {
      await removeFile(targetPath);
    }
  }
}

async function updateFile(sourcePath, targetPath) {
  const content = transformContent(sourcePath, targetPath, await fetchText(rawGithubUrl(sourcePath)));
  const target = join(root, targetPath);
  const current = await readTextIfExists(target);

  if (current === content) {
    unchanged.push(targetPath);
    return;
  }

  updated.push(targetPath);

  if (!dryRun) {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

function transformContent(sourcePath, targetPath, content) {
  if (!targetPath.startsWith(".github/workflows/") || !content.includes("secrets.GH_TOKEN")) {
    return content;
  }

  let nextContent = content.replaceAll("${{ secrets.GH_TOKEN }}", "${{ steps.app-token.outputs.token }}");

  if (sourcePath === ".github/workflows/tag.yaml") {
    nextContent = nextContent.replace(
      "\n      - name: Create tag from the main branch\n",
      `\n      - uses: actions/create-github-app-token@v3
        if: steps.check-version.outputs.is_release == 'true'
        id: app-token
        with:
          client-id: 1248576
          private-key: \${{ secrets.AUTOMATION_APP_PRIVATE_KEY }}

      - name: Create tag from the main branch\n`,
    );
  } else {
    nextContent = nextContent.replace(
      "\n    steps:\n",
      `\n    steps:
      - uses: actions/create-github-app-token@v3
        id: app-token
        with:
          client-id: 1248576
          private-key: \${{ secrets.AUTOMATION_APP_PRIVATE_KEY }}
\n`,
    );
  }

  if (sourcePath === ".github/workflows/biome-migrate.yaml" || sourcePath === ".github/workflows/trunk-upgrade.yaml") {
    nextContent = nextContent.replaceAll("default_author: github_actions", "default_author: github_actor");
  }

  nextContent = addPrMergeStep(sourcePath, nextContent);

  return nextContent;
}

function addPrMergeStep(sourcePath, content) {
  const mergeCommands = new Map([
    [".github/workflows/biome-migrate.yaml", "gh pr merge --admin --squash --delete-branch automated/biome-migrate"],
    [".github/workflows/npm-dedupe.yaml", "gh pr merge --auto --squash --delete-branch automated/npm-dedupe"],
    [".github/workflows/npm-version.yaml", "gh pr merge --auto --squash --delete-branch automated/npm-version"],
    [".github/workflows/trunk-upgrade.yaml", "gh pr merge --admin --squash --delete-branch automated/trunk-upgrade"],
  ]);
  const mergeCommand = mergeCommands.get(sourcePath);

  if (!mergeCommand || content.includes(mergeCommand)) {
    return content;
  }

  return content.replace(
    "\n          fi\n        env:\n",
    `\n          fi\n\n          ${mergeCommand}\n        env:\n`,
  );
}

async function updatePackageJson() {
  const sourcePackage = await fetchJson(rawGithubUrl("package.json"));
  const targetPath = "package.json";
  const target = join(root, targetPath);
  const targetPackage = JSON.parse(await readFile(target, "utf8"));

  const nextPackage = {
    ...targetPackage,
    scripts: sourcePackage.scripts,
    engines: sourcePackage.engines,
  };
  const nextContent = `${JSON.stringify(nextPackage, null, 2)}\n`;
  const current = await readFile(target, "utf8");

  if (current === nextContent) {
    unchanged.push(targetPath);
    return;
  }

  updated.push(targetPath);

  if (!dryRun) {
    await writeFile(target, nextContent);
  }
}

async function removeFile(targetPath) {
  removed.push(targetPath);

  if (!dryRun) {
    await rm(join(root, targetPath));
  }
}

async function fetchJson(url) {
  const text = await fetchText(url);

  return JSON.parse(text);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.raw+json",
      "User-Agent": "lens-extension-certificate-info-config-updater",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function readTextIfExists(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function githubApiUrl(path) {
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`;
}

function rawGithubUrl(path) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path}`;
}

function printSummary() {
  const mode = dryRun ? "Would update" : "Updated";

  for (const targetPath of updated) {
    console.log(`${mode}: ${targetPath}`);
  }

  for (const targetPath of removed) {
    console.log(`${dryRun ? "Would remove" : "Removed"}: ${targetPath}`);
  }

  if (updated.length === 0 && removed.length === 0) {
    console.log("No changes.");
  }

  console.log(`Checked ${updated.length + unchanged.length} files from ${owner}/${repo}@${ref}.`);
}
