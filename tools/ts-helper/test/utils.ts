import child_process from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import del from 'del';
import { promisify } from 'node:util';
import { createTsHelperInstance, TsHelperOption } from '../dist';
import { mm } from '@eggjs/mock';
const psList: child_process.ChildProcess[] = [];

beforeEach(mm.restore);

export const tscBin = getBin('tsc');
export const eggBin = getBin('egg-bin');

export function getBin(name) {
  return path.resolve(__dirname, `../node_modules/.bin/${name}${(os.platform() === 'win32' ? '.cmd' : '')}`);
}

export function triggerBin(...args: string[]) {
  const ps = spawn(
    'node',
    [ path.resolve(__dirname, '../dist/bin.js') ].concat(args),
    {
      env: {
        ...process.env,
        ETS_SILENT: 'false',
      },
    },
  );

  return ps;
}

export function triggerBinSync(...args: string[]) {
  return child_process.spawnSync(
    'node',
    [ path.resolve(__dirname, '../dist/bin.js') ].concat(args),
    {
      env: {
        ...process.env,
        ETS_SILENT: 'false',
      },
    },
  );
}

export function tsc(cwd: string) {
  const p = spawn(tscBin, [ '-p', path.resolve(cwd, './tsconfig.json') ], { cwd });
  return new Promise(resolve => p.on('close', resolve));
}

export async function getOutput(...args: string[]) {
  const ps = triggerBin.apply(null, args);
  const { stdout } = await getStd(ps, false, 0);
  return stdout;
}

export function fork(modulePath: string, args?: string[], opt?: child_process.ForkOptions) {
  const ps = child_process.fork(modulePath, args, opt);
  addProc(ps);
  return ps;
}

export function spawn(cmd: string, args: string[] = [], opt: child_process.SpawnOptions = {}) {
  const ps = child_process.spawn(cmd, args, opt);
  addProc(ps);
  return ps;
}

export function addProc(proc: child_process.ChildProcess) {
  if (!psList.includes(proc)) psList.push(proc);
}

export function getStd(proc: child_process.ChildProcess, autoKill?: boolean, waitTime?: number, waitInfo?: { stdout?: string | RegExp; stderr?: string | RegExp }) {
  addProc(proc);
  if (!waitInfo && waitTime === undefined) {
    waitTime = +(process.env.UT_WAIT_TIME || 5000);
  }

  return new Promise<{ stdout: string; stderr: string}>(resolve => {
    let stdout = '';
    let stderr = '';
    let tick;
    const killProc = () => proc.emit('SIGINT');
    const end = () => {
      proc.removeListener('close', end);
      resolve({ stdout, stderr });
    };

    const wait = () => {
      if (!waitTime) {
        return;
      }

      clearTimeout(tick);
      tick = setTimeout(() => {
        end();
        if (autoKill) {
          if (process.env.DEBUG) {
            console.info('auto kill');
          }

          killProc();
        }
      }, waitTime);
    };

    const checkStd = (c: string | RegExp, std: string) => {
      if (typeof c === 'string') {
        return std.includes(c);
      }
      return c.exec(std);
    };

    proc.stdout!.on('data', data => {
      if (process.env.DEBUG) {
        process.stdout.write(data);
      }
      stdout += data.toString();
      if (waitInfo && waitInfo.stdout) {
        if (checkStd(waitInfo.stdout, stdout)) {
          end();
          killProc();
        }
      } else {
        wait();
      }
    });

    proc.stderr!.on('data', data => {
      if (process.env.DEBUG) {
        process.stderr.write(data);
      }
      stderr += data.toString();
      if (waitInfo && waitInfo.stderr) {
        if (checkStd(waitInfo.stderr, stderr)) {
          end();
          killProc();
        }
      } else {
        wait();
      }
    });

    proc.once('close', end);
  });
}

afterEach(() => {
  psList.forEach(ps => {
    if (ps && !ps.killed) {
      ps.kill('SIGINT');
    }
  });
  psList.length = 0;

  restoreTasks.reverse().forEach(fn => fn());
  restoreTasks.length = 0;
});

export function timeout(delay, callback?: () => any) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      if (callback) callback();
      reject(new Error('timeout'));
    }, delay);
  });
}

const restoreTasks: Array<(...args: any) => any> = [];
export function addRestore(fn) {
  restoreTasks.push(fn);
  return () => {
    fn();
    const index = restoreTasks.indexOf(fn);
    if (index >= 0) restoreTasks.splice(index, 1);
  };
}

export function sleep(time) {
  return new Promise(res => setTimeout(res, time));
}

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
export async function mockFile(url, content, otherFile?: string) {
  const existFile = (await readFile(url)).toString();
  await writeFile(url, otherFile ? (await readFile(otherFile)) : content);
  return addRestore(() => fs.writeFileSync(url, existFile));
}

export function createTsHelper(options: TsHelperOption) {
  const tsHelper = createTsHelperInstance(options);
  addRestore(() => tsHelper.destroy());
  return tsHelper;
}

export function timeoutPromise(cb, t = 10000) {
  return Promise.race([
    new Promise(cb),
    timeout(t),
  ]);
}

export function createNodeModuleSym(dir: string) {
  del.sync(path.resolve(dir, './node_modules'));
  fs.symlinkSync(path.resolve(__dirname, '../node_modules'), path.resolve(dir, './node_modules'), 'dir');
}
