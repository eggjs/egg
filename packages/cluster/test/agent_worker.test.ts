import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import coffee from 'coffee';
import { mm, MockApplication } from '@eggjs/mock';
import { cluster, getFilepath } from './utils.js';

describe('test/agent_worker.test.ts', () => {
  let app: MockApplication;

  afterEach(mm.restore);

  describe('Fork Agent', () => {
    afterEach(() => app && app.close());

    it('support config agent debug port', () => {
      mm(process.env, 'EGG_AGENT_DEBUG_PORT', '15800');
      app = cluster('apps/agent-debug-port', { isDebug: true, require: [ './inject1.js' ] } as any);
      return app
        // .debug()
        .expect('stdout', /@@inject1\.js run/)
        .expect('stdout', /=15800/)
        .end();
    });

    it('agent debug port default 5800', () => {
      app = cluster('apps/agent-debug-port', { isDebug: true } as any);
      return app
        // .debug()
        .expect('stdout', /=5800/)
        .end();
    });

    it('should exist when error happened during boot', () => {
      app = cluster('apps/agent-die-onboot');
      return app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /\[master\] agent_worker#1:\d+ start fail, exiting with code:1/)
        .expect('stderr', /error: app worker throw/)
        .end();
    });

    it('should not start app when error happened during agent starting', () => {
      app = cluster('apps/agent-die-onboot');
      return app
        .expect('code', 1)
        .expect('stderr', /\[master\] agent_worker#1:\d+ start fail, exiting with code:1/)
        .expect('stderr', /error: app worker throw/)
        .notExpect('stdout', /agent\-error\-but\-app\-start/)
        .end();
    });

    it('should refork new agent_worker after app started', async () => {
      app = cluster('apps/agent-die');
      await app
        // .debug()
        .expect('stdout', /\[master\] egg started on http:\/\/127.0.0.1:\d+/)
        .end();

      app.process.send({
        to: 'agent',
        action: 'kill-agent',
      });

      await scheduler.wait(5000);

      app.expect('stderr', /\[master\] agent_worker#1:\d+ died/);
      app.expect('stdout', /\[master\] try to start a new agent_worker after 1s .../);
      app.expect('stdout', /\[master\] agent_worker#2:\d+ started/);
      app.notExpect('stdout', /app_worker#2/);
    });

    it('should exit agent_worker when master die in accident', async () => {
      app = cluster('apps/agent-die');
      await app
        // .debug()
        .expect('stdout', /\[master\] egg started on http:\/\/127.0.0.1:\d+/)
        .end();

      // kill -9 master
      app.process.kill('SIGKILL');
      await scheduler.wait(5000);
      app.expect('stderr', /\[app_worker\] receive disconnect event in cluster fork mode, exitedAfterDisconnect:false/)
        .expect('stderr', /\[agent_worker\] receive disconnect event on child_process fork mode, exiting with code:110/)
        .expect('stderr', /\[agent_worker\] exit with code:110/);
    });

    it('should master exit when agent exit during app worker boot', () => {
      app = cluster('apps/agent-die-on-forkapp');

      return app
        // .debug()
        .expect('code', 1)
        .expect('stdout', /\[master\] agent_worker#1:\d+ started/)
        .expect('stderr', /\[master\] agent_worker#1:\d+ died/)
        .expect('stderr', /\[master\] agent_worker#1:\d+ start fail, exiting with code:1/)
        .expect('stderr', /\[master\] exit with code:1/)
        .notExpect('stdout', /app_worker#2/)
        .end();
    });

    it('should exit when emit error during agent worker boot', () => {
      app = cluster('apps/agent-start-error');
      return app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /mock error/)
        .expect('stderr', /\[agent_worker\] start error, exiting with code:1/)
        .expect('stderr', /\[master\] exit with code:1/)
        .end();
    });

    it('should FrameworkErrorformater work during agent boot', () => {
      app = cluster('apps/agent-start-framework-error');
      return app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /CustomError: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/)
        .end();
    });

    it('should FrameworkErrorformater work during agent boot ready', () => {
      app = cluster('apps/agent-start-framework-ready-error');
      return app
        // .debug()
        .expect('code', 1)
        .expect('stderr', /CustomError: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/)
        .end();
    });

    // process.send is not exist if started by spawn
    it('master should not die if spawn error', async () => {
      app = coffee.spawn('node', [ getFilepath('apps/agent-die/start.js') ]) as any;
      // app.debug();
      app.close = async () => app.proc.kill();

      await scheduler.wait(3000);
      app.emit('close', 0);
      app.expect('stderr', /Error: Cannot find module/);
      app.notExpect('stderr', /TypeError: process.send is not a function/);
    });
  });

  describe('agent custom loggers', () => {
    before(() => {
      app = cluster('apps/custom-logger');
      return app.ready();
    });
    after(() => app.close());

    it('should support custom logger in agent', async () => {
      await scheduler.wait(1500);
      const content = await readFile(
        getFilepath('apps/custom-logger/logs/monitor.log'), 'utf8');
      assert(content === 'hello monitor!\n');
    });
  });
});
