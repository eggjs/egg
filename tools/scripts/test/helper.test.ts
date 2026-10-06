import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.hoisted(() => vi.fn());
const runScriptMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFile: execFileMock,
}));
vi.mock('runscript', () => ({ runScript: runScriptMock }));

async function loadHelper(platform: string) {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  try {
    return await import('../src/helper.ts');
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
  }
}

beforeEach(() => {
  vi.resetModules();
  execFileMock.mockReset();
  runScriptMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

for (const platform of ['linux', 'win32']) {
  describe(`findNodeProcess on ${platform}`, () => {
    async function discovery() {
      const processes = [
        { pid: 123, cmd: 'node --snapshot-blob "C:\\路径 with spaces\\snapshot.blob" -- --title=one' },
        { pid: 456, cmd: 'node unrelated.js' },
      ];
      if (platform === 'win32') {
        execFileMock.mockImplementation((_command, _args, callback) =>
          callback(null, {
            stdout: JSON.stringify([
              ...processes.map(({ pid, cmd }) => ({ ProcessId: pid, CommandLine: cmd })),
              { ProcessId: 789, CommandLine: null },
            ]),
          }),
        );
      } else {
        runScriptMock.mockResolvedValue({
          stdout: ` PID COMMAND\n${processes.map(({ pid, cmd }) => `${pid} ${cmd}`).join('\n')}\n789 /bin/sh -c node unrelated.js\n987 unrelated\n`,
        });
      }
      return { ...(await loadHelper(platform)), processes };
    }

    it('returns discovered processes when no filter is supplied', async () => {
      const { findNodeProcess, processes } = await discovery();
      expect(await findNodeProcess()).toEqual(processes);
    });

    it('keeps only processes accepted by the filter', async () => {
      const { findNodeProcess, processes } = await discovery();
      expect(await findNodeProcess((item) => item.pid === 123)).toEqual([processes[0]]);
      expect(await findNodeProcess(() => false)).toEqual([]);
    });
  });
}

describe('Windows CIM output', () => {
  for (const stdout of ['', '[]']) {
    it(`accepts an empty process list ${JSON.stringify(stdout)}`, async () => {
      execFileMock.mockImplementation((_command, _args, callback) => callback(null, { stdout }));
      const { findNodeProcess } = await loadHelper('win32');
      expect(await findNodeProcess()).toEqual([]);
    });
  }
  it('accepts a single CIM object', async () => {
    execFileMock.mockImplementation((_command, _args, callback) =>
      callback(null, {
        stdout: JSON.stringify({ ProcessId: 123, CommandLine: 'node app.js' }),
      }),
    );
    const { findNodeProcess } = await loadHelper('win32');
    expect(await findNodeProcess()).toEqual([{ pid: 123, cmd: 'node app.js' }]);
  });
});
