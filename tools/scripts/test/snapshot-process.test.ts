import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import Stop from '../src/commands/stop.ts';
import { findNodeProcess } from '../src/helper.ts';

it.skipIf(Number(process.versions.node.split('.')[0]) < 24 || process.platform === 'win32')(
  'discovers and stops a real restored snapshot and closes its HTTP port',
  async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-snapshot-process-'));
    const source = path.join(directory, 'build.cjs');
    const blob = path.join(directory, 'snapshot.blob');
    const title = `egg-snapshot-process-${process.pid}`;
    let child: ReturnType<typeof spawn> | undefined;
    try {
      await fs.writeFile(
        source,
        `require('node:v8').startupSnapshot.setDeserializeMainFunction(() => {
        require('node:http').createServer((req, res) => res.end('ready')).listen(0, '127.0.0.1', function () {
          console.log(this.address().port);
        });
      });`,
      );
      const build = spawnSync(process.execPath, ['--snapshot-blob', blob, '--build-snapshot', source], {
        encoding: 'utf8',
      });
      assert.equal(build.status, 0, build.stderr);
      child = spawn(process.execPath, ['--snapshot-blob', blob, '--', `--title=${title}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const exited = once(child, 'exit');
      let stderr = '';
      child.stderr!.on('data', (data) => {
        stderr += data.toString();
      });
      const [data] = await Promise.race([
        once(child.stdout!, 'data'),
        exited.then(() => {
          throw new Error(`Snapshot exited before listening: ${stderr}`);
        }),
      ]);
      const port = Number(data.toString().trim());
      expect(port).toBeGreaterThan(0);
      expect((await fetch(`http://127.0.0.1:${port}`)).status).toBe(200);
      const processes = await findNodeProcess((item) => item.pid === child!.pid);
      expect(processes).toHaveLength(1);
      expect(processes[0].cmd).toContain('--snapshot-blob');
      expect(processes[0].cmd).toContain(`--title=${title}`);
      await Stop.run(['--title', title, '--timeout', '10']);
      await exited;
      expect(await findNodeProcess((item) => item.pid === child!.pid)).toEqual([]);
      await expect(fetch(`http://127.0.0.1:${port}`)).rejects.toThrow();
    } finally {
      child?.kill();
      await fs.rm(directory, { recursive: true, force: true });
    }
  },
);
