import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const phase = process.argv[2] ?? "probe";
const root = process.cwd();
const compiledConfig = join(root, ".open-next/.build/open-next.config.edge.mjs");
const workerJs = join(root, ".open-next/worker.js");
const openNextDir = join(root, ".open-next");
const nextDir = join(root, ".next");

function listDir(dir) {
  if (!existsSync(dir)) return null;
  try {
    return readdirSync(dir);
  } catch {
    return ["<unreadable>"];
  }
}

const wranglerPath = join(root, "wrangler.jsonc");
const wranglerText = existsSync(wranglerPath)
  ? (await import("node:fs")).readFileSync(wranglerPath, "utf8")
  : "";

const payload = {
  sessionId: "d43142",
  runId: process.env.DEBUG_RUN_ID ?? "pre-fix",
  hypothesisId: "A",
  location: "scripts/debug-cf-open-next.mjs",
  message: "OpenNext deploy preflight",
  timestamp: Date.now(),
  data: {
    phase,
    cwd: root,
    compiledConfigExists: existsSync(compiledConfig),
    workerJsExists: existsSync(workerJs),
    openNextDirExists: existsSync(openNextDir),
    openNextDirListing: listDir(openNextDir),
    openNextBuildListing: listDir(join(openNextDir, ".build")),
    nextDirExists: existsSync(nextDir),
    nextDirHasBuildId: existsSync(join(nextDir, "BUILD_ID")),
    wranglerJsoncExists: existsSync(wranglerPath),
    wranglerHasCommentVars: wranglerText.includes("comment_vars"),
    wranglerHasAssets: wranglerText.includes('".open-next/assets"'),
    openNextConfigExists: existsSync(join(root, "open-next.config.ts")),
    packageBuildScript: null,
    env: {
      OPEN_NEXT_DEPLOY: process.env.OPEN_NEXT_DEPLOY ?? null,
      CI: process.env.CI ?? null,
      WORKERS_CI: process.env.WORKERS_CI ?? null,
      CF_PAGES: process.env.CF_PAGES ?? null,
      npm_lifecycle_event: process.env.npm_lifecycle_event ?? null,
    },
  },
};

try {
  const pkg = JSON.parse(
    await import("node:fs").then((fs) =>
      fs.readFileSync(join(root, "package.json"), "utf8"),
    ),
  );
  payload.data.packageBuildScript = pkg.scripts?.build ?? null;
  payload.data.packageDeployScript = pkg.scripts?.deploy ?? null;
  payload.data.packageBuildWorkerScript = pkg.scripts?.["build:worker"] ?? null;
} catch {
  payload.data.packageReadError = true;
}

if (existsSync(workerJs)) {
  payload.data.workerJsBytes = statSync(workerJs).size;
}

await fetch("http://127.0.0.1:7411/ingest/acef58ea-7e10-4d32-b743-4d8cf1f27ff7", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "d43142",
  },
  body: JSON.stringify(payload),
}).catch(() => {});

console.log(
  `[debug-cf-open-next] phase=${phase} compiledConfigExists=${payload.data.compiledConfigExists} workerJsExists=${payload.data.workerJsExists} nextDirExists=${payload.data.nextDirExists}`,
);
