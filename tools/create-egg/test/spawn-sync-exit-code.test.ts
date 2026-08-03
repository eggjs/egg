import os from 'node:os';

import { expect, test } from 'vitest';

import { spawnSyncExitCode } from '../src/index.ts';

// `spawn.sync` reports `status: null` when the child was terminated by a
// signal on Unix; the custom-command path used to run `process.exit(status ?? 0)`,
// turning a signal death into a success exit.
test('mirrors a numeric status as-is', () => {
  expect(spawnSyncExitCode({ status: 0, signal: null })).toBe(0);
  expect(spawnSyncExitCode({ status: 2, signal: null })).toBe(2);
});

test('maps a signal death to 128 + signal number', () => {
  expect(spawnSyncExitCode({ status: null, signal: 'SIGTERM' })).toBe(128 + os.constants.signals.SIGTERM);
  expect(spawnSyncExitCode({ status: null, signal: 'SIGKILL' })).toBe(128 + os.constants.signals.SIGKILL);
  expect(spawnSyncExitCode({ status: null, signal: 'SIGINT' })).toBe(128 + os.constants.signals.SIGINT);
});

test('falls back to 1 when neither status nor signal is available', () => {
  expect(spawnSyncExitCode({ status: null, signal: null })).toBe(1);
});
