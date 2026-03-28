import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ManifestStore } from '../../src/loader/manifest.ts';
import type { StartupManifest } from '../../src/loader/manifest.ts';

export function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'egg-manifest-test-'));
}

export function setupBaseDir(options?: {
  lockfile?: 'pnpm' | 'npm' | 'yarn' | 'none';
  configFiles?: Record<string, string>;
}): string {
  const baseDir = createTmpDir();
  const lockfile = options?.lockfile ?? 'pnpm';
  if (lockfile === 'pnpm') {
    fs.writeFileSync(path.join(baseDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  } else if (lockfile === 'npm') {
    fs.writeFileSync(path.join(baseDir, 'package-lock.json'), '{"lockfileVersion": 3}');
  } else if (lockfile === 'yarn') {
    fs.writeFileSync(path.join(baseDir, 'yarn.lock'), '# yarn lockfile v1\n');
  }

  const configDir = path.join(baseDir, 'config');
  fs.mkdirSync(configDir, { recursive: true });
  if (options?.configFiles) {
    for (const [name, content] of Object.entries(options.configFiles)) {
      fs.writeFileSync(path.join(configDir, name), content);
    }
  } else {
    fs.writeFileSync(path.join(configDir, 'config.default.ts'), 'export default {};\n');
  }

  return baseDir;
}

export async function generateAndWrite(
  baseDir: string,
  overrides?: Partial<StartupManifest>,
): Promise<StartupManifest> {
  const manifest = ManifestStore.generate({
    baseDir,
    serverEnv: 'prod',
    serverScope: '',
    typescriptEnabled: true,
  });
  Object.assign(manifest, overrides);
  await ManifestStore.write(baseDir, manifest);
  return manifest;
}
