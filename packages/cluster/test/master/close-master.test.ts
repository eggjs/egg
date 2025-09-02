import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { once } from 'node:events';

import { describe, it, afterEach } from 'vitest';
import { mm, MockApplication } from '@eggjs/mock';

import { cluster } from '../utils.ts';

let app: MockApplication;

afterEach(mm.restore);

describe('close master', () => {
  afterEach(() => app.close());

  it('master will close agent and app worker', async () => {
    mm.env('local');
    mm(process.env, 'EGG_APP_WORKER_LOGGER_LEVEL', 'INFO');
    mm(process.env, 'EGG_AGENT_WORKER_LOGGER_LEVEL', 'INFO');
    mm(process.env, 'EGG_MASTER_LOGGER_LEVEL', 'DEBUG');
    app = cluster('apps/master-worker-started');
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    // 2017-05-27 21:24:38,064 INFO 59065 [master] master is killed by signal SIGTERM, closing
    // 2017-05-27 21:24:38,065 INFO 59065 [master] close done, exiting with code:0
    // 2017-05-27 21:24:38,065 INFO 59065 [master] exit with code:0
    // 2017-05-27 21:24:38,067 INFO 59067 [app_worker] receive signal SIGTERM, exiting with code:0
    // 2017-05-27 21:24:38,068 INFO 59067 [app_worker] exit with code:0
    // 2017-05-27 21:24:38,106 INFO 59066 [agent_worker] receive signal SIGTERM, exiting with code:0
    // 2017-05-27 21:24:38,107 INFO 59066 [agent_worker] exit with code:0
    app.proc.kill('SIGTERM');
    await scheduler.wait(6000);
    assert(app.proc.killed === true);
    app.expect(
      'stdout',
      /INFO \d+ \[master\] master is killed by signal SIGTERM, closing/
    );
    app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
    app.expect(
      'stdout',
      /\[master\] process info: heap_limit \d+, heap_used \d+/
    );
    app.expect(
      'stdout',
      /DEBUG \d+ \[master\] close done, exiting with code:0/
    );
    app.expect('stdout', /INFO \d+ \[master\] exit with code:0/);
    app.expect(
      'stdout',
      /INFO \d+ \[app_worker\] receive signal SIGTERM, exiting with code:0/
    );
    app.expect(
      'stdout',
      /INFO \d+ \[agent_worker\] receive signal SIGTERM, exiting with code:0/
    );
    app.notExpect(
      'stderr',
      /\[app_worker\] receive disconnect event in cluster fork mode/
    );
    app.notExpect('stderr', /\[agent_worker\] receive disconnect event /);
    app.expect('stdout', /INFO \d+ \[app_worker\] exit with code:0/);
    app.expect('stdout', /INFO \d+ \[agent_worker\] exit with code:0/);
    app.expect('stdout', /INFO \d+ \[master\] wait 5000ms/);
  });

  it.skip('master kill by SIGKILL and agent, app worker exit too', async () => {
    mm.env('local');
    app = cluster('apps/master-worker-started');
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    // 2017-05-28 00:08:19,047 INFO 59500 [master] egg started on http://127.0.0.1:17001 (2364ms)
    // 2017-05-28 00:08:19,058 ERROR 59502 [app_worker] receive disconnect event in cluster fork mode, exitedAfterDisconnect:false
    // 2017-05-28 00:08:19,108 ERROR 59501 [agent_worker] receive disconnect event on child_process fork mode, exiting with code:110
    // 2017-05-28 00:08:19,109 ERROR 59501 [agent_worker] exit with code:110
    app.proc.kill('SIGKILL');

    await scheduler.wait(6000);
    assert(app.proc.killed === true);
    app.notExpect(
      'stdout',
      /\[master\] master is killed by signal SIGTERM, closing/
    );
    app.notExpect('stdout', /\[master\] close done, exiting with code:0/);
    app.notExpect('stdout', /\[master\] exit with code:0/);
    app.expect('stderr', /\[app_worker\] receive disconnect event /);
    app.expect('stderr', /\[agent_worker\] receive disconnect event /);
    app.expect('stderr', /\[agent_worker\] exit with code:110/);
  });

  it.skip('master kill by SIGKILL and exit multi workers', async () => {
    mm.env('local');
    app = cluster('apps/master-worker-started', { workers: 4 });
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    // 2017-05-28 00:08:19,047 INFO 59500 [master] egg started on http://127.0.0.1:17001 (2364ms)
    // 2017-05-28 00:08:19,058 ERROR 59502 [app_worker] receive disconnect event in cluster fork mode, exitedAfterDisconnect:false
    // 2017-05-28 00:08:19,108 ERROR 59501 [agent_worker] receive disconnect event on child_process fork mode, exiting with code:110
    // 2017-05-28 00:08:19,109 ERROR 59501 [agent_worker] exit with code:110
    app.proc.kill('SIGKILL');

    await scheduler.wait(6000);
    assert(app.proc.killed === true);
    app.notExpect(
      'stdout',
      /\[master\] master is killed by signal SIGTERM, closing/
    );
    app.notExpect('stdout', /\[master\] close done, exiting with code:0/);
    app.notExpect('stdout', /\[master\] exit with code:0/);
    app.expect('stderr', /\[app_worker\] receive disconnect event /);
    app.expect('stderr', /\[agent_worker\] receive disconnect event /);
    app.expect('stderr', /\[agent_worker\] exit with code:110/);
  });

  it.skip('use SIGTERM close master', async () => {
    mm.env('local');
    app = cluster('apps/master-worker-started');
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    // 2017-05-28 00:14:32,982 INFO 59714 [master] egg started on http://127.0.0.1:17001 (1606ms)
    // 2017-05-28 00:14:32,987 INFO 59714 [master] master is killed by signal SIGTERM, closing
    // 2017-05-28 00:14:32,988 INFO 59714 [master] close done, exiting with code:0
    // 2017-05-28 00:14:32,988 INFO 59714 [master] exit with code:0
    // 2017-05-28 00:14:32,996 INFO 59716 [app_worker] receive signal SIGTERM, exiting with code:0
    // 2017-05-28 00:14:32,997 INFO 59716 [app_worker] exit with code:0
    // 2017-05-28 00:14:33,047 INFO 59715 [agent_worker] receive signal SIGTERM, exiting with code:0
    // 2017-05-28 00:14:33,048 INFO 59715 [agent_worker] exit with code:0
    app.proc.kill('SIGTERM');
    await scheduler.wait(6000);
    assert(app.proc.killed === true);
    app.expect(
      'stdout',
      /\[master\] master is killed by signal SIGTERM, closing/
    );
    app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
    app.expect(
      'stdout',
      /\[master\] process info: heap_limit \d+, heap_used \d+/
    );
    app.expect('stdout', /\[master\] exit with code:0/);
  });

  it.skip('use SIGQUIT close master', async () => {
    mm.env('local');
    app = cluster('apps/master-worker-started');
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    app.proc.kill('SIGQUIT');
    await scheduler.wait(6000);

    assert(app.proc.killed === true);
    app.expect(
      'stdout',
      /\[master\] master is killed by signal SIGQUIT, closing/
    );
    app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
    app.expect(
      'stdout',
      /\[master\] process info: heap_limit \d+, heap_used \d+/
    );
    app.expect('stdout', /\[master\] exit with code:0/);
  });

  it.skip('use SIGINT close master', async () => {
    mm.env('local');
    app = cluster('apps/master-worker-started');
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    app.proc.kill('SIGINT');
    await scheduler.wait(6000);

    assert(app.proc.killed === true);
    app.expect(
      'stdout',
      /\[master\] master is killed by signal SIGINT, closing/
    );
    app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
    app.expect(
      'stdout',
      /\[master\] process info: heap_limit \d+, heap_used \d+/
    );
    app.expect('stdout', /\[master\] exit with code:0/);
  });

  it.skip('should close when set EGG_MASTER_CLOSE_TIMEOUT', async () => {
    mm.env('local');
    mm(process.env, 'EGG_APP_WORKER_LOGGER_LEVEL', 'INFO');
    mm(process.env, 'EGG_AGENT_WORKER_LOGGER_LEVEL', 'INFO');
    mm(process.env, 'EGG_MASTER_LOGGER_LEVEL', 'DEBUG');
    mm(process.env, 'EGG_MASTER_CLOSE_TIMEOUT', 1000);
    app = cluster('apps/master-worker-started');
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    app.proc.kill('SIGTERM');
    await scheduler.wait(2000);
    assert(app.proc.killed === true);
    app.expect('stdout', /INFO \d+ \[master\] exit with code:0/);
    app.expect('stdout', /INFO \d+ \[master\] wait 1000ms/);
  });

  it.skip('kill order', async () => {
    mm.env('local');
    mm(process.env, 'EGG_APP_WORKER_LOGGER_LEVEL', 'INFO');
    mm(process.env, 'EGG_AGENT_WORKER_LOGGER_LEVEL', 'INFO');
    mm(process.env, 'EGG_MASTER_LOGGER_LEVEL', 'DEBUG');
    mm(process.env, 'EGG_APP_CLOSE_TIMEOUT', 1000);
    mm(process.env, 'EGG_AGENT_CLOSE_TIMEOUT', 1000);
    app = cluster('apps/worker-close-timeout');

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    app.proc.kill('SIGTERM');
    await once(app.proc, 'exit');

    app.expect('stdout', /INFO \d+ \[master\] exit with code:0/);
    app.expect('stdout', /INFO \d+ \[master\] wait 1000ms/);
    const appTimeoutMatch = app.stdout.match(/app worker start close: (\d+)/);
    const agentTimeoutMatch = app.stdout.match(
      /agent worker start close: (\d+)/
    );
    const appTimeout = Number(appTimeoutMatch && appTimeoutMatch[1]);
    const agentTimeout = Number(agentTimeoutMatch && agentTimeoutMatch[1]);
    assert(!Number.isNaN(appTimeout));
    assert(!Number.isNaN(agentTimeout));
    assert(agentTimeout - appTimeout > 1000);

    assert(!/app worker never called after timeout/.test(app.stdout));
    assert(!/agent worker never called after timeout/.test(app.stdout));
  });

  it('close master will terminate all sub processes', async () => {
    mm.env('local');
    app = cluster('apps/sub-process');

    await app
      .expect('stdout', /egg start/)
      // .debug()
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    await scheduler.wait(3000);
    app.proc.kill('SIGTERM');
    await scheduler.wait(5000);
    assert(app.proc.killed === true);
    app.expect('stdout', /worker1 \[\d+\] started/);
    app.expect('stdout', /worker2 \[\d+\] started/);

    app.expect(
      'stdout',
      /\[master\] master is killed by signal SIGTERM, closing/
    );
    app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
    app.expect(
      'stdout',
      /\[master\] process info: heap_limit \d+, heap_used \d+/
    );
    app.expect('stdout', /\[master\] exit with code:0/);
    app.expect('stdout', /worker1 on sigterm and exit/);
    app.expect('stdout', /worker2 on sigterm and exit/);

    // worker1 and worker2 are both exit
    let res = app.stdout.match(/worker1 \[(\d+)\] started/);
    const pid1 = res && res[1];
    res = app.stdout.match(/worker2 \[(\d+)\] started/);
    const pid2 = res && res[1];
    assert(!alive(pid1));
    assert(!alive(pid2));
  });

  it('close master will terminate all sub processes with sigkill', async () => {
    mm.env('local');
    app = cluster('apps/sub-process-sigkill');

    await app
      .expect('stdout', /egg start/)
      // .debug()
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    await scheduler.wait(5000);
    app.proc.kill('SIGTERM');
    await scheduler.wait(8000);
    assert(app.proc.killed === true);
    app.expect('stdout', /worker1 \[\d+\] started/);
    app.expect('stdout', /worker2 \[\d+\] started/);

    app.expect(
      'stdout',
      /\[master\] master is killed by signal SIGTERM, closing/
    );
    app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
    app.expect(
      'stdout',
      /\[master\] process info: heap_limit \d+, heap_used \d+/
    );
    app.expect('stdout', /\[master\] exit with code:0/);
    app.expect('stdout', /worker1 on sigterm and not exit/);
    app.expect('stdout', /worker2 on sigterm and exit/);
    app.expect('stdout', /worker1 alived/);

    // worker1 and worker2 are both exit
    let res = app.stdout.match(/worker1 \[(\d+)\] started/);
    const pid1 = res && res[1];
    res = app.stdout.match(/worker2 \[(\d+)\] started/);
    const pid2 = res && res[1];
    assert(!alive(pid1));
    assert(!alive(pid2));
  });
});

function alive(pid: number) {
  try {
    // success means it's still alive
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // error means it's dead
    return false;
  }
}
