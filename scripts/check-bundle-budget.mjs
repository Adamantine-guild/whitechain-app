#!/usr/bin/env node
/**
 * check-bundle-budget.mjs
 *
 * Enforces the bundle-size budget from issue #30 ("main chunk under 500KB").
 * Reads the Next.js build manifests (.next/app-build-manifest.json +
 * .next/build-manifest.json) and computes each route's First Load JS by
 * summing the actual chunk files referenced for that route. We report both the
 * raw and gzip sizes; the budget is compared against the GZIP (transfer) size,
 * which is what users actually download.
 *
 * Exits non-zero (and reports the offending routes) when the budget is exceeded,
 * so it can run in CI as `npm run size` to prevent bundle regressions.
 *
 * Pure Node (no dependencies) so it stays in the initial toolchain.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const nextDir = join(root, '.next');

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 500);

/** Abort with a message and non-zero exit. */
export function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

/** Gzip size in KB of a file on disk (0 if missing). */
export function gzipKbOf(file) {
  if (!existsSync(file)) return 0;
  return gzipSync(readFileSync(file)).length / 1024;
}

/** Raw size in KB of a file on disk (0 if missing). */
export function rawKbOf(file) {
  if (!existsSync(file)) return 0;
  return statSync(file).size / 1024;
}

/** Resolve a hashed Next chunk path under .next. */
export function staticChunkPath(chunk) {
  return resolve(nextDir, chunk);
}

/** "/page" -> "/", "/dashboard/page" -> "/dashboard", "/layout" -> "/". */
export function normalizeRoute(key) {
  return key.replace(/\/page$/, '').replace(/\/layout$/, '') || '/';
}

function dedupe(arr) {
  return [...new Set(arr)];
}

function round(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Compute First Load JS (gzip KB) per route from the App Router manifest.
 * Returns [{ route, gzipKb, rawKb }].
 *
 * The framework/main/webpack chunks are the shared baseline (rootMainFiles).
 * Each route's First Load JS = shared baseline + that route's specific files.
 * Layout entries are skipped (not navigable routes; their files are already
 * part of the pages that use them).
 */
export function computeRouteSizes(appManifest, buildManifest) {
  const sharedFiles = dedupe(buildManifest.rootMainFiles ?? []);
  const pages = appManifest.pages ?? {};

  const out = [];
  const seen = new Set();
  for (const [routeKey, files] of Object.entries(pages)) {
    if (routeKey.endsWith('/layout')) continue;

    const all = dedupe([...sharedFiles, ...files]);
    let gzip = 0;
    let raw = 0;
    for (const f of all) {
      const p = staticChunkPath(f);
      gzip += gzipKbOf(p);
      raw += rawKbOf(p);
    }
    const route = normalizeRoute(routeKey);
    if (seen.has(route)) continue; // de-dupe (e.g. both "/page" and "/")
    seen.add(route);
    out.push({ route, gzipKb: round(gzip), rawKb: round(raw) });
  }
  return out;
}

/** Run the budget check against the local .next build output. */
export function run() {
  const appManifestPath = join(nextDir, 'app-build-manifest.json');
  const buildManifestPath = join(nextDir, 'build-manifest.json');

  if (!existsSync(appManifestPath) || !existsSync(buildManifestPath)) {
    fail('Next build output missing. Run `npm run build` first.');
  }

  const appManifest = JSON.parse(readFileSync(appManifestPath, 'utf8'));
  const buildManifest = JSON.parse(readFileSync(buildManifestPath, 'utf8'));

  const routeSizes = computeRouteSizes(appManifest, buildManifest);
  if (routeSizes.length === 0) {
    fail('No routes found in build manifest.');
  }

  let budgetExceeded = false;
  console.log(
    `\n📦 Bundle budget check (limit: ${BUDGET_KB} KB gzip First Load JS per route)\n`
  );
  console.log('Route'.padEnd(24), 'Gzip'.padStart(10), 'Raw'.padStart(10));
  for (const { route, gzipKb, rawKb } of routeSizes) {
    const ok = gzipKb <= BUDGET_KB;
    if (!ok) budgetExceeded = true;
    console.log(
      route.padEnd(24),
      `${gzipKb.toFixed(1)} KB`.padStart(10),
      `${rawKb.toFixed(1)} KB`.padStart(10),
      ok ? '✅' : '❌ OVER BUDGET'
    );
  }

  if (budgetExceeded) {
    fail(`One or more routes exceed the ${BUDGET_KB} KB gzip budget.`);
  }

  console.log(`\n✅ All routes within budget (≤ ${BUDGET_KB} KB gzip).\n`);
  process.exit(0);
}

// Execute only when run as a script (not when imported by tests).
const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
if (invoked === resolve(fileURLToPath(import.meta.url))) {
  run();
}
