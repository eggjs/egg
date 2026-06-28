#!/usr/bin/env node
/**
 * Generate `.utoo.toml` from `pnpm-workspace.yaml`.
 *
 * `ut pm-pack` (utoo >= 1.1) resolves `catalog:` / `catalog:<name>` protocols
 * from `.utoo.toml`, NOT from `pnpm-workspace.yaml`. To keep
 * `pnpm-workspace.yaml` the single source of truth, we generate the TOML mirror
 * on demand instead of committing a hand-maintained copy.
 *
 * pnpm `catalog:` map      -> `[catalog]`
 * pnpm `catalogs.<name>`   -> `[catalogs.<name>]`
 *
 * Usage:
 *   node scripts/gen-utoo-catalog.mjs            # writes <root>/.utoo.toml
 *   node scripts/gen-utoo-catalog.mjs --print    # print to stdout, write nothing
 */
import fs from 'node:fs';
import path from 'node:path';

import yaml from 'js-yaml';

// TOML keys that are not bare-key-safe (A-Za-z0-9_-) must be quoted.
const BARE_KEY = /^[A-Za-z0-9_-]+$/;
function tomlKey(name) {
  return BARE_KEY.test(name) ? name : JSON.stringify(name);
}
function tomlValue(version) {
  // version specs are always strings; JSON.stringify gives a valid TOML basic string
  return JSON.stringify(String(version));
}

function renderCatalogTable(entries) {
  return Object.keys(entries)
    .sort()
    .map((name) => `${tomlKey(name)} = ${tomlValue(entries[name])}`)
    .join('\n');
}

export function generateUtooToml(rootDir = process.cwd()) {
  const wsPath = path.join(rootDir, 'pnpm-workspace.yaml');
  const ws = yaml.load(fs.readFileSync(wsPath, 'utf8')) ?? {};

  const blocks = [
    '# AUTO-GENERATED from pnpm-workspace.yaml by scripts/gen-utoo-catalog.mjs',
    '# Do not edit by hand. Source of truth is pnpm-workspace.yaml.',
  ];

  if (ws.catalog && Object.keys(ws.catalog).length > 0) {
    blocks.push(`[catalog]\n${renderCatalogTable(ws.catalog)}`);
  }

  if (ws.catalogs && Object.keys(ws.catalogs).length > 0) {
    for (const catalogName of Object.keys(ws.catalogs).sort()) {
      const entries = ws.catalogs[catalogName];
      if (entries && Object.keys(entries).length > 0) {
        blocks.push(`[catalogs.${tomlKey(catalogName)}]\n${renderCatalogTable(entries)}`);
      }
    }
  }

  return blocks.join('\n\n') + '\n';
}

function main() {
  const rootDir = process.cwd();
  const toml = generateUtooToml(rootDir);
  if (process.argv.includes('--print')) {
    process.stdout.write(toml);
    return;
  }
  const out = path.join(rootDir, '.utoo.toml');
  fs.writeFileSync(out, toml);
  console.log(`Wrote ${out} (${toml.split('\n').length} lines)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
