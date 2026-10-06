#!/usr/bin/env node
/**
 * Compatibility entry point: .utoo.toml is now tracked native configuration.
 * Reading remains available for callers of generateUtooToml; writing is refused
 * so old migration commands cannot overwrite the authoritative catalogs.
 */
import fs from 'node:fs';
import path from 'node:path';

export function generateUtooToml(rootDir = process.cwd()) {
  return fs.readFileSync(path.join(rootDir, '.utoo.toml'), 'utf8');
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  if (process.argv.includes('--print')) {
    process.stdout.write(generateUtooToml());
  } else {
    console.error('.utoo.toml is tracked native configuration; edit it directly, then run ut install or ut update.');
    process.exitCode = 1;
  }
}
