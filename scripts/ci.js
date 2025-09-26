#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  const rootDir = join(import.meta.dirname, '..');
  const projectName = process.argv[2];
  const baseDir = join(rootDir, projectName);
  const dirs = readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => join(projectName, d.name));

  if (dirs.length === 0) {
    console.error('❌ no dirs found');
    process.exit(1);
  }

  // join dirs
  const cmd = `vitest run --coverage ${dirs.join(' ')}`;
  console.log('👉 Running:', cmd);

  execSync(cmd, { stdio: 'inherit', cwd: rootDir });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
