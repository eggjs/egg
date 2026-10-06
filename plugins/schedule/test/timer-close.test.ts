import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { getFixtures } from './utils.ts';

const execFileAsync = promisify(execFile);

describe('schedule shutdown', () => {
  it.each(['interval', 'cron', 'long', 'immediate'])('should naturally exit after closing %s timers', async (mode) => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import=@oxc-node/core/register', getFixtures('timer-close/strategy.ts'), mode],
      { timeout: 5000 },
    );
    expect(stdout.trim()).toBe('closed');
  });

  it.each(['http', 'delay'])('should naturally exit after application shutdown (%s)', async (mode) => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import=@oxc-node/core/register', getFixtures('timer-close/application.ts'), mode],
      { timeout: 10000 },
    );
    expect(stdout.trim()).toBe('closed');
  });
});
