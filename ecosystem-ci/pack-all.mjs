#!/usr/bin/env node
/**
 * Pack every publishable workspace package into a tgz at the repo root using
 * utoo's `ut pm-pack`, as a drop-in replacement for `pnpm -r pack` in the
 * ecosystem-ci (E2E) workflow.
 *
 * Why this exists (utoo >= 1.1 quirks):
 * - `ut pm-pack` resolves `workspace:` deps via the npm-style `workspaces`
 *   field in the root package.json -- NOT from pnpm-workspace.yaml. So we
 *   temporarily inject `workspaces` (mirrored from pnpm-workspace.yaml) for the
 *   duration of packing, then restore package.json.
 * - `ut pm-pack` resolves `catalog:` deps from `.utoo.toml`, NOT from
 *   pnpm-workspace.yaml. We generate `.utoo.toml` from pnpm-workspace.yaml.
 * - `ut pm-pack` does NOT apply `publishConfig` overrides the way npm/pnpm do.
 *   egg packages keep dev `exports` pointing at `src/*.ts` and override them to
 *   `dist/*.js` via `publishConfig.exports`, so we apply `publishConfig` onto
 *   each manifest before packing (then restore it), otherwise the tarballs ship
 *   `src` exports and downstream installs fail with MODULE_NOT_FOUND.
 * - `ut pm-pack <path>` writes the tgz INTO the package dir (no
 *   --pack-destination). patch-project.ts expects all tgz at the repo root with
 *   npm-standard names, so we move them up.
 *
 * The `ut` binary can be overridden with UT_BIN (used by local validation to
 * point at a pinned utoo version). The repository tree is restored afterward.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { glob } from 'node:fs/promises';
import path from 'node:path';

import yaml from 'js-yaml';

import { generateUtooToml } from '../scripts/gen-utoo-catalog.mjs';

const rootDir = path.join(import.meta.dirname, '..');
const UT_BIN = process.env.UT_BIN || (process.platform === 'win32' ? 'ut.cmd' : 'ut');

// Keys in publishConfig that control how npm publishes rather than manifest
// fields consumers read; these must NOT be copied onto the published manifest.
const PUBLISH_CONTROL_KEYS = new Set(['access', 'tag', 'registry', 'provenance', 'otp']);

const ws = yaml.load(fs.readFileSync(path.join(rootDir, 'pnpm-workspace.yaml'), 'utf8'));

// Read a file, returning null when it does not exist (avoids a TOCTOU
// existsSync check before reading).
function readFileOrNull(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// Discover publishable packages exactly like patch-project.ts: glob each
// workspace pattern for package.json, skip private / nameless packages.
async function discoverPackages() {
  const packages = [];
  for (const pattern of ws.packages) {
    for await (const entry of glob(`${pattern}/package.json`, { cwd: rootDir })) {
      const pkgJsonPath = path.join(rootDir, entry);
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if (pkgJson.private || !pkgJson.name) continue;
        packages.push({ name: pkgJson.name, dir: path.dirname(entry), version: pkgJson.version });
      } catch {
        console.warn(`Warning: could not read ${pkgJsonPath}`);
      }
    }
  }
  return packages;
}

// npm-standard tarball name, matches patch-project.ts's expectation.
function tgzName(name, version) {
  return `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
}

// Apply publishConfig manifest overrides (e.g. exports -> dist) the way
// npm/pnpm do at publish time, skipping publish-control-only keys.
function applyPublishConfig(manifest) {
  const pc = manifest.publishConfig;
  if (!pc) return manifest;
  for (const [key, value] of Object.entries(pc)) {
    if (!PUBLISH_CONTROL_KEYS.has(key)) manifest[key] = value;
  }
  return manifest;
}

async function main() {
  const pkgJsonPath = path.join(rootDir, 'package.json');
  const originalPkgJson = fs.readFileSync(pkgJsonPath, 'utf8');
  const utooTomlPath = path.join(rootDir, '.utoo.toml');
  const originalUtooToml = readFileOrNull(utooTomlPath);

  // package.json files we mutated and still owe a restore (path -> original).
  const pendingRestores = new Map();

  try {
    // 1. Generate .utoo.toml so pm-pack can resolve catalog:/catalog:<name>.
    fs.writeFileSync(utooTomlPath, generateUtooToml(rootDir));

    // 2. Inject npm-style `workspaces` so pm-pack can discover workspace pkgs.
    const pkgJson = JSON.parse(originalPkgJson);
    pkgJson.workspaces = ws.packages;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

    const packages = await discoverPackages();
    console.log(`📦 Packing ${packages.length} packages with ${UT_BIN} pm-pack`);

    for (const pkg of packages) {
      // 3. Apply publishConfig (exports -> dist, etc.) before packing so the
      //    tarball ships the published manifest, then restore the source file.
      const manifestPath = path.join(rootDir, pkg.dir, 'package.json');
      const originalManifest = fs.readFileSync(manifestPath, 'utf8');
      pendingRestores.set(manifestPath, originalManifest);
      const manifest = applyPublishConfig(JSON.parse(originalManifest));
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

      execFileSync(UT_BIN, ['pm-pack', pkg.dir], { cwd: rootDir, stdio: 'inherit' });

      fs.writeFileSync(manifestPath, originalManifest);
      pendingRestores.delete(manifestPath);

      const file = tgzName(pkg.name, pkg.version);
      const from = path.join(rootDir, pkg.dir, file);
      const to = path.join(rootDir, file);
      try {
        fs.renameSync(from, to);
      } catch (err) {
        throw new Error(`Expected tarball not found: ${from}`, { cause: err });
      }
      console.log(`  -> ${file}`);
    }
    console.log(`✅ Packed ${packages.length} tarballs into ${rootDir}`);
  } finally {
    // Restore everything we touched.
    fs.writeFileSync(pkgJsonPath, originalPkgJson);
    for (const [manifestPath, original] of pendingRestores) {
      fs.writeFileSync(manifestPath, original);
    }
    if (originalUtooToml === null) {
      fs.rmSync(utooTomlPath, { force: true });
    } else {
      fs.writeFileSync(utooTomlPath, originalUtooToml);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
