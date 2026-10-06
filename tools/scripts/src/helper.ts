import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { runScript } from 'runscript';

export const isWindows = process.platform === 'win32';

const REGEX = /^\s*(\d+)\s+(.*)/;
const execFileAsync = promisify(execFile);

export interface NodeProcess {
  pid: number;
  cmd: string;
}

export type FilterFunction = (item: NodeProcess) => boolean;

export async function findNodeProcess(filterFn?: FilterFunction): Promise<NodeProcess[]> {
  if (isWindows) {
    // WMIC is absent on current Windows installations. CIM provides the same
    // command line and PID without depending on the optional WMIC executable.
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '$ErrorActionPreference = "Stop"; [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); ' +
        'Get-CimInstance Win32_Process -Filter "Name = \'node.exe\'" | ' +
        'Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress',
    ]);
    const result:
      | { ProcessId: number; CommandLine: string | null }[]
      | { ProcessId: number; CommandLine: string | null } = JSON.parse(stdout.trim() || '[]');
    const processes = Array.isArray(result) ? result : [result];
    return processes.flatMap(({ ProcessId, CommandLine }) => {
      if (!CommandLine) return [];
      const item = { pid: ProcessId, cmd: CommandLine };
      return filterFn?.(item) ? [item] : [];
    });
  }
  // command, cmd are aliases of args, not POSIX standard, so we use args.
  const command = 'ps --help 2>&1 | grep -q BusyBox && ps -o "pid,args" || ps -wweo "pid,args"';
  const stdio = await runScript(command, { stdio: 'pipe' });
  const processList = stdio
    .stdout!.toString()
    .split('\n')
    .reduce<NodeProcess[]>((arr, line) => {
      if (!!line && !line.includes('/bin/sh') && line.includes('node')) {
        const m = line.match(REGEX);
        if (m) {
          const item: NodeProcess = { pid: parseInt(m[1]), cmd: m[2] };
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
  pids.forEach((pid) => {
    try {
      process.kill(pid, signal);
    } catch (err: any) {
      if (err.code !== 'ESRCH') {
        throw err;
      }
    }
  });
}
