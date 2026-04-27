import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const FIXTURE_BASE = path.join(__dirname, 'fixtures/apps/minimal-app');
const SCRIPT_PATH = path.join(REPO_ROOT, 'tools/egg-bundler/src/scripts/generate-manifest.mjs');
const FRAMEWORK_DIR = path.join(REPO_ROOT, 'packages/egg');
const FRAMEWORK_ENTRY = pathToFileURL(path.join(FRAMEWORK_DIR, 'src/index.ts')).href;

const require = createRequire(import.meta.url);
const TSX_ESM = pathToFileURL(require.resolve('tsx/esm')).href;

async function runGenerateManifest(baseDir: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const payload = {
    baseDir,
    framework: FRAMEWORK_DIR,
    frameworkEntry: FRAMEWORK_ENTRY,
    env: 'prod',
  };
  const child = spawn(process.execPath, [`--import=${TSX_ESM}`, SCRIPT_PATH, JSON.stringify(payload)], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      EGG_MANIFEST: 'true',
    },
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`generate-manifest subprocess timed out\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, 15000);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

describe('generate-manifest subprocess', () => {
  let tmpBaseDir: string | undefined;

  afterEach(async () => {
    if (tmpBaseDir) {
      await fs.rm(tmpBaseDir, { recursive: true, force: true });
      tmpBaseDir = undefined;
    }
  });

  it('writes the manifest and exits without app.close or beforeClose side effects', async () => {
    tmpBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-manifest-'));
    await fs.cp(FIXTURE_BASE, tmpBaseDir, { recursive: true });
    await fs.rm(path.join(tmpBaseDir, '.egg'), { recursive: true, force: true });
    await fs.symlink(path.join(REPO_ROOT, 'tools/egg-bundler/node_modules'), path.join(tmpBaseDir, 'node_modules'));
    await fs.mkdir(path.join(tmpBaseDir, 'logs'), { recursive: true });
    await fs.writeFile(
      path.join(tmpBaseDir, 'config/config.default.ts'),
      `
import path from 'node:path';
import type { EggAppInfo } from 'egg';

export default (appInfo: EggAppInfo) => {
  return {
    keys: 'minimal-app-keys',
    middleware: ['timing'],
    logger: {
      dir: path.join(appInfo.baseDir, 'logs'),
    },
    static: {
      prefix: '/public/',
      dir: path.join(appInfo.baseDir, 'app/public'),
    },
  };
};
`,
    );

    await fs.writeFile(
      path.join(tmpBaseDir, 'app.ts'),
      `
import fs from 'node:fs';
import path from 'node:path';
import type { Application, ILifecycleBoot } from 'egg';

export default class AppBoot implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
    app.on('close', () => {
      fs.writeFileSync(path.join(app.baseDir, 'app-close-called'), '1');
    });
  }

  async beforeClose(): Promise<void> {
    fs.writeFileSync(path.join(this.app.baseDir, 'before-close-called'), '1');
    throw new Error('beforeClose should not run during manifest generation');
  }
}
`,
    );

    const result = await runGenerateManifest(tmpBaseDir);

    expect(result.code, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    await expect(fs.stat(path.join(tmpBaseDir, '.egg/manifest.json'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpBaseDir, 'app-close-called'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(path.join(tmpBaseDir, 'before-close-called'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
