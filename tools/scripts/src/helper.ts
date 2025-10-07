import { runScript } from 'runscript';

export const isWindows = process.platform === 'win32';

const REGEX = isWindows ? /^(.*)\s+(\d+)\s*$/ : /^\s*(\d+)\s+(.*)/;

export interface NodeProcess {
  pid: number;
  cmd: string;
}

export type FilterFunction = (item: NodeProcess) => boolean;

export async function findNodeProcess(filterFn?: FilterFunction): Promise<NodeProcess[]> {
  const command = isWindows
    ? 'wmic Path win32_process Where "Name = \'node.exe\'" Get CommandLine,ProcessId'
    : // command, cmd are alias of args, not POSIX standard, so we use args
      'ps -wweo "pid,args"';
  const stdio = await runScript(command, { stdio: 'pipe' });
  const processList = stdio
    .stdout!.toString()
    .split('\n')
    .reduce<NodeProcess[]>((arr, line) => {
      if (!!line && !line.includes('/bin/sh') && line.includes('node')) {
        const m = line.match(REGEX);
        if (m) {
          const item: NodeProcess = isWindows ? { pid: parseInt(m[2]), cmd: m[1] } : { pid: parseInt(m[1]), cmd: m[2] };
          if (filterFn?.(item)) {
            arr.push(item);
          }
        }
      }
      return arr;
    }, []);
  return processList;
}

export function kill(pids: number[], signal?: string | number) {
  pids.forEach(pid => {
    try {
      process.kill(pid, signal);
    } catch (err: any) {
      if (err.code !== 'ESRCH') {
        throw err;
      }
    }
  });
}
