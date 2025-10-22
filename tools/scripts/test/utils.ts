import { scheduler } from 'node:timers/promises';
import { ChildProcess } from 'node:child_process';

import { Coffee as _Coffee } from 'coffee';

import { isWindows, findNodeProcess } from '../src/helper.ts';

export type Coffee = _Coffee & {
  proc: ChildProcess;
  stderr: string;
  stdout: string;
  code?: number;
};

export async function cleanup(baseDir: string) {
  const processList = await findNodeProcess(x => {
    const dir = isWindows ? baseDir.replace(/\\/g, '\\\\') : baseDir;
    const prefix = isWindows ? '\\"baseDir\\":\\"' : '"baseDir":"';
    return x.cmd.includes(`${prefix}${dir}`);
  });

  if (processList.length) {
    console.log(`cleanup: ${processList.length} to kill`);
    for (const item of processList) {
      const pid = item.pid;
      const cmd = item.cmd;
      let type = 'unknown: ' + cmd;
      if (cmd.includes('start-cluster')) {
        type = 'master';
      } else if (cmd.includes('app_worker.js')) {
        type = 'worker';
      } else if (cmd.includes('agent_worker.js')) {
        type = 'agent';
      }

      try {
        process.kill(pid, type === 'master' ? '' : 'SIGKILL');
        console.log(`cleanup ${type} ${pid}`);
      } catch (err: any) {
        console.log(`cleanup ${type} ${pid} got error ${err.code || err.message || err}`);
        if (err.code !== 'ESRCH') {
          throw err;
        }
      }
    }

    await scheduler.wait(500);
  }
}

export function replaceWeakRefMessage(stderr: string) {
  // Using compatibility WeakRef and FinalizationRegistry\r\n
  if (stderr.includes('Using compatibility WeakRef and FinalizationRegistry')) {
    stderr = stderr.replace(/Using compatibility WeakRef and FinalizationRegistry[\r\n]*/g, '');
  }
  return stderr;
}
