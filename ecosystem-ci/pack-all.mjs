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
 * - `ut pm-pack <path>` writes the tgz INTO the package dir (no
 *   --pack-destination). patch-project.ts expects all tgz at the repo root with
 *   npm-standard names, so we move them up.
 *
 * The `ut` binary can be overridden with UT_BIN (used by local validation to
 * point at a pinned utoo version).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { glob } from 'node:fs/promises';
import path from 'node:path';

import yaml from 'js-yaml';

import { generateUtooToml } from '../scripts/gen-utoo-catalog.mjs';

const rootDir = path.join(import.meta.dirname, '..');
const UT_BIN = process.env.UT_BIN || (process.platform === 'win32' ? 'ut.cmd' : 'ut');

const ws = yaml.load(fs.readFileSync(path.join(rootDir, 'pnpm-workspace.yaml'), 'utf8'));

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

async function main() {
  const pkgJsonPath = path.join(rootDir, 'package.json');
  const originalPkgJson = fs.readFileSync(pkgJsonPath, 'utf8');
  const utooTomlPath = path.join(rootDir, '.utoo.toml');
  const utooTomlExisted = fs.existsSync(utooTomlPath);

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
      execFileSync(UT_BIN, ['pm-pack', pkg.dir], { cwd: rootDir, stdio: 'inherit' });
      const file = tgzName(pkg.name, pkg.version);
      const from = path.join(rootDir, pkg.dir, file);
      const to = path.join(rootDir, file);
      if (!fs.existsSync(from)) {
        throw new Error(`Expected tarball not found: ${from}`);
      }
      fs.renameSync(from, to);
      console.log(`  -> ${file}`);
    }
    console.log(`✅ Packed ${packages.length} tarballs into ${rootDir}`);
  } finally {
    // Restore package.json; remove generated .utoo.toml unless it pre-existed.
    fs.writeFileSync(pkgJsonPath, originalPkgJson);
    if (!utooTomlExisted && fs.existsSync(utooTomlPath)) fs.rmSync(utooTomlPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
