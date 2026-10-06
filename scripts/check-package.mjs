import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { publint } from 'publint';
import { formatMessage } from 'publint/utils';

import {
  applyPublishConfigOverrides,
  getCatalogs,
  getWorkspaceVersionMap,
  resolveWorkspaceProtocols,
} from './utils.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const execFileAsync = promisify(execFile);
// Capture before tsdown starts rewriting manifests in parallel.
const defaultProtocols = { versionMap: getWorkspaceVersionMap(root), catalogs: getCatalogs(root) };

async function pack(directory) {
  // Invoke the installed JavaScript entrypoint directly, including on Windows.
  await execFileAsync(process.execPath, [path.join(root, 'node_modules/utoo/bin/utoo.js'), 'pm-pack', directory], {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024,
  });
}

/** Validate an isolated copy; never rewrite manifests used by parallel builds. */
export async function checkPackage(manifestPath, overrides = {}) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.private) return;
  const protocols = overrides.protocols ?? defaultProtocols;
  const published = resolveWorkspaceProtocols(applyPublishConfigOverrides(manifest), protocols);
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-publint-'));
  const directory = path.join(temporary, 'package');
  try {
    await fs.cp(path.dirname(manifestPath), directory, {
      recursive: true,
      filter: (source) => !['node_modules', '.git', '.egg'].includes(path.basename(source)),
    });
    await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify(published, null, 2) + '\n');
    await (overrides.pack ?? pack)(directory);
    const tarballPath = path.join(
      directory,
      `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`,
    );
    const tarball = await fs.readFile(tarballPath);
    const { messages, pkg } = await (overrides.check ?? publint)({
      pack: { tarball },
      level: 'suggestion',
      strict: true,
    });
    for (const message of messages) console.log(`[publint] ${manifest.name}: ${formatMessage(message, pkg)}`);
    if (messages.some((message) => message.type === 'error')) throw new Error(`publint failed for ${manifest.name}`);
    console.log(`[publint] ${manifest.name}: utoo tarball checked`);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
