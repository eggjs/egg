import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { execaNode } from 'execa';
import { afterEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, '..', 'src/scripts/generate-manifest.mjs');

async function createReproApp(): Promise<string> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-manifest-'));
  await fs.writeFile(
    path.join(baseDir, 'framework.mjs'),
    `
import fs from 'node:fs';
import path from 'node:path';

export async function start(options) {
  fs.writeFileSync(path.join(options.baseDir, 'start-options.json'), JSON.stringify(options, null, 2));
  setInterval(() => {}, 1000);
  return {
    loader: {
      generateManifest() {
        return {
          version: 1,
          generatedAt: new Date().toISOString(),
          invalidation: {
            lockfileFingerprint: 'minimal-repro',
            configFingerprint: 'minimal-repro',
            serverEnv: options.env ?? 'prod',
            serverScope: '',
            typescriptEnabled: true,
          },
          extensions: {},
          resolveCache: {},
          fileDiscovery: {},
        };
      },
    },
    async close() {
      fs.writeFileSync(path.join(options.baseDir, 'app-close-called'), '1');
      fs.writeFileSync(path.join(options.baseDir, 'before-close-called'), '1');
      throw new Error('can not get proto for clazz ChangesStreamService');
    },
  };
}
`,
  );
  return baseDir;
}

describe('generate-manifest subprocess', () => {
  let tmpApp: string | undefined;

  afterEach(async () => {
    if (tmpApp) {
      await fs.rm(tmpApp, { recursive: true, force: true });
      tmpApp = undefined;
    }
  });

  it('starts in metadataOnly mode and exits without app.close side effects', async () => {
    tmpApp = await createReproApp();
    const payload = {
      baseDir: tmpApp,
      frameworkEntry: pathToFileURL(path.join(tmpApp, 'framework.mjs')).href,
      env: 'prod',
    };

    await execaNode(SCRIPT_PATH, [], {
      input: JSON.stringify(payload),
      stdin: 'pipe',
      timeout: 5_000,
    });

    const startOptions = JSON.parse(await fs.readFile(path.join(tmpApp, 'start-options.json'), 'utf8')) as {
      metadataOnly?: boolean;
    };
    expect(startOptions.metadataOnly).toBe(true);
    await expect(fs.stat(path.join(tmpApp, '.egg/manifest.json'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpApp, 'app-close-called'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpApp, 'before-close-called'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
