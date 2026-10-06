import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, it } from 'vitest';
const run = promisify(execFile);
const fixture = fileURLToPath(new URL('../fixtures/master-thread-shutdown.mjs', import.meta.url));
describe('master with real worker threads', () => {
  it('awaits app and agent beforeClose through the standard entry', async () => {
    const { stdout } = await run(process.execPath, [fixture, 'graceful'], { timeout: 20000 });
    assert.match(stdout, /app closed/);
    assert.match(stdout, /agent closed/);
    assert(stdout.indexOf('app closed') < stdout.indexOf('agent closing'));
    assert.doesNotMatch(stdout, /terminate .* timeout/);
    assert.match(stdout, /close done, exiting with code:0/);
  });
  it('terminates hanging app and agent cleanup', async () => {
    const { stdout } = await run(process.execPath, [fixture, 'hang'], {
      timeout: 20000,
      env: { ...process.env, EGG_MASTER_CLOSE_TIMEOUT: '200' },
    });
    assert.match(stdout, /terminate app worker#1 after 200ms timeout/);
    assert.match(stdout, /terminate agent worker#1 after 200ms timeout/);
    assert.doesNotMatch(stdout, /never called after timeout/);
    assert.match(stdout, /close done, exiting with code:0/);
  });
  it.each(['app', 'agent'])('reports %s cleanup failure after attempting both workers', async (role) => {
    await assert.rejects(
      run(process.execPath, [fixture, 'graceful'], {
        timeout: 20000,
        env: { ...process.env, WORKER_CLOSE_FAIL: role },
      }),
      (error: any) => {
        assert.equal(error.code, 1);
        assert.match(error.stdout, /app closing/);
        assert.match(error.stdout, /agent closing/);
        assert.match(error.stderr, /cleanup failed/);
        assert.doesNotMatch(error.stdout, /close done, exiting with code:0/);
        return true;
      },
    );
  });
  it('does not refork an agent when shutdown begins before its delayed restart', async () => {
    const { stdout } = await run(process.execPath, [fixture, 'race'], { timeout: 20000 });
    assert.match(stdout, /try to start a new agent_worker after 1s/);
    assert.match(stdout, /shutdown-reforks 0/);
    assert(Number(stdout.match(/shutdown-duration (\d+)/)![1]) < 1000);
    assert.doesNotMatch(stdout, /new agent_worker starting/);
  });
});
