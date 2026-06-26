import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodeProcess } from '../src/helper.ts';

const killMock = vi.hoisted(() => vi.fn());
const processList = vi.hoisted(() => ({ value: [] as NodeProcess[] }));

vi.mock('../src/helper.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/helper.ts')>();
  return {
    ...actual,
    findNodeProcess: vi.fn(async (filter: (item: NodeProcess) => boolean) => processList.value.filter(filter)),
    kill: killMock,
  };
});

import Stop from '../src/commands/stop.ts';

describe('test/snapshot-stop.test.ts', () => {
  beforeEach(() => {
    killMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops a `--snapshot-blob` process matched by --title', async () => {
    processList.value = [
      {
        pid: 4242,
        cmd: 'node --no-deprecation --trace-warnings --snapshot-blob /app/snapshot.blob --title=egg-server-foo',
      },
      { pid: 1, cmd: 'node unrelated.js' },
    ];

    await Stop.run(['--title', 'egg-server-foo', '--timeout', '10']);

    expect(killMock).toHaveBeenCalledTimes(1);
    expect(killMock.mock.calls[0][0]).toEqual([4242]);
  });

  it('does not stop a snapshot process whose title does not match', async () => {
    processList.value = [
      {
        pid: 4242,
        cmd: 'node --snapshot-blob /app/snapshot.blob --title=egg-server-other',
      },
    ];

    await Stop.run(['--title', 'egg-server-foo', '--timeout', '10']);

    expect(killMock).not.toHaveBeenCalled();
  });

  it('stops any snapshot-started server when no --title is given', async () => {
    processList.value = [{ pid: 7, cmd: 'node --snapshot-blob /app/snapshot.blob --title=egg-server-foo' }];

    await Stop.run(['--timeout', '10']);

    expect(killMock).toHaveBeenCalledTimes(1);
    expect(killMock.mock.calls[0][0]).toEqual([7]);
  });

  it('never kills an in-progress `egg-bin snapshot build`', async () => {
    processList.value = [
      {
        pid: 99,
        cmd: 'node --snapshot-blob /app/snapshot.blob --build-snapshot /app/worker.js --title=egg-server-foo',
      },
    ];

    // even without --title (broadest match), a build must not be targeted
    await Stop.run(['--timeout', '10']);
    expect(killMock).not.toHaveBeenCalled();
  });

  it('does not kill a bare `node --snapshot-blob` without a --title token when no --title given', async () => {
    processList.value = [{ pid: 5, cmd: 'node --snapshot-blob /app/snapshot.blob' }];

    await Stop.run(['--timeout', '10']);
    expect(killMock).not.toHaveBeenCalled();
  });

  it('matches the title at argv boundaries (foo does not match foo-bar)', async () => {
    processList.value = [{ pid: 8, cmd: 'node --snapshot-blob /app/snapshot.blob --title=egg-server-foo-bar' }];

    await Stop.run(['--title', 'egg-server-foo', '--timeout', '10']);
    expect(killMock).not.toHaveBeenCalled();
  });
});
