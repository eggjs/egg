import { debuglog } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { once } from 'node:events';
import { ChildProcess } from 'node:child_process';
import { pstree } from '@fengmk2/ps-tree';

const debug = debuglog('@eggjs/cluster/utils/terminate');

interface SubProcess extends ChildProcess {
  process?: ChildProcess;
}

export async function terminate(subProcess: SubProcess, timeout: number) {
  const pid = subProcess.process?.pid ?? subProcess.pid;
  const childPids = await getChildPids(pid!);
  await Promise.all([
    killProcess(subProcess, timeout),
    killChildren(childPids, timeout),
  ]);
}

// kill process, if SIGTERM not work, try SIGKILL
async function killProcess(subProcess: SubProcess, timeout: number) {
  // https://github.com/nodejs/node/pull/34312
  (subProcess.process ?? subProcess).kill('SIGTERM');
  await Promise.race([
    once(subProcess, 'exit'),
    sleep(timeout),
  ]);
  if (subProcess.killed) {
    return;
  }
  // SIGKILL: http://man7.org/linux/man-pages/man7/signal.7.html
  // worker: https://github.com/nodejs/node/blob/master/lib/internal/cluster/worker.js#L22
  // subProcess.kill is wrapped to subProcess.destroy, it will wait to disconnected.
  (subProcess.process ?? subProcess).kill('SIGKILL');
}

// kill all children processes, if SIGTERM not work, try SIGKILL
async function killChildren(childrenPids: number[], timeout: number) {
  if (childrenPids.length === 0) {
    return;
  }
  kill(childrenPids, 'SIGTERM');

  const start = Date.now();
  // if timeout is 1000, it will check twice.
  const checkInterval = 400;
  let unterminated: number[] = [];

  while (Date.now() - start < timeout - checkInterval) {
    await sleep(checkInterval);
    unterminated = getUnterminatedProcesses(childrenPids);
    if (unterminated.length === 0) {
      return;
    }
  }
  kill(unterminated, 'SIGKILL');
}

async function getChildPids(pid: number) {
  let childrenPids: number[] = [];
  try {
    const children = await pstree(pid);
    childrenPids = children!.map(c => parseInt(c.PID));
  } catch (err) {
    // if get children error, just ignore it
    debug('pstree %s error: %s, ignore it', pid, err);
  }
  return childrenPids;
}

function kill(pids: number[], signal: string) {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch (err) {
      // ignore
      debug('kill %s error: %s, signal: %s, ignore it', pid, err, signal);
    }
  }
}

function getUnterminatedProcesses(pids: number[]) {
  return pids.filter(pid => {
    try {
      // success means it's still alive
      process.kill(pid, 0);
      return true;
    } catch (err) {
      // error means it's dead
      debug('kill %s error: %s, it still alive', pid, err);
      return false;
    }
  });
}

