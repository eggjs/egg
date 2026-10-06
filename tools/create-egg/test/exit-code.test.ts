import os from 'node:os';

import { expect, test } from 'vitest';

import { toExitCode } from '../src/utils.ts';

test('mirrors a numeric exit code as-is', () => {
  expect(toExitCode(0, null)).toBe(0);
  expect(toExitCode(2, null)).toBe(2);
});

test('maps a signal death to 128 + signal number', () => {
  expect(toExitCode(null, 'SIGTERM')).toBe(128 + os.constants.signals.SIGTERM);
});

test('falls back to 1 for a missing or unknown signal', () => {
  expect(toExitCode(null, null)).toBe(1);
  expect(toExitCode(null, 'SIGFAKE' as NodeJS.Signals)).toBe(1);
});
