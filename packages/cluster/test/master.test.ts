import path from 'node:path';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { rm } from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { once } from 'node:events';
import { request } from '@eggjs/supertest';
import { mm, MockApplication } from '@eggjs/mock';
import { cluster, getFilepath } from './utils.js';

describe('test/master.test.ts', () => {
  let app: MockApplication;

  afterEach(mm.restore);

  describe('start master', () => {
    afterEach(() => app && app.close());

    it('start success in local env', done => {
      mm.env('local');
      app = cluster('apps/master-worker-started');

      app.expect('stdout', /egg start/)
        .expect('stdout', /egg started/)
        .notExpect('stdout', /\[master\] agent_worker#1:\d+ start with clusterPort:\d+/)
        .expect('code', 0)
        .end(done);
    });

    it('start success in prod env', done => {
      mm.env('prod');
      app = cluster('apps/mock-production-app')
        .debug(false);

      app.expect('stdout', /egg start/)
        .expect('stdout', /egg started/)
        .expect('code', 0)
        .end((err: unknown) => {
          assert.ifError(err);
          console.log(app.stdout);
          console.log(app.stderr);
          done();
        });
    });

    it('should print process.on.HOST while egg started', done => {
      mm.env('prod');
      mm(process.env, 'HOST', 'xxx.com');
      app = cluster('apps/mock-production-app')
        .debug(false);

      app.expect('stdout', /egg start/)
        .expect('stdout', /egg started on http:\/\/xxx\.com:/)
        .expect('code', 0)
        .end((err: unknown) => {
          assert.ifError(err);
          console.log(app.stdout);
          console.log(app.stderr);
          done();
        });
    });

    it('should not print process.on.HOST if it equals 0.0.0.0', done => {
      mm.env('prod');
      mm(process.env, 'HOST', '0.0.0.0');
      app = cluster('apps/mock-production-app')
        .debug(false);

      app.expect('stdout', /egg start/)
        .expect('stdout', /egg started on http:\/\/127\.0\.0\.1:/)
        .expect('code', 0)
        .end((err: unknown) => {
          assert.ifError(err);
          console.log(app.stdout);
          console.log(app.stderr);
          done();
        });
    });
  });

  describe('close master', () => {
    afterEach(() => app.close());

    it('master will close agent and app worker', async () => {
      mm.env('local');
      mm(process.env, 'EGG_APP_WORKER_LOGGER_LEVEL', 'INFO');
      mm(process.env, 'EGG_AGENT_WORKER_LOGGER_LEVEL', 'INFO');
      mm(process.env, 'EGG_MASTER_LOGGER_LEVEL', 'DEBUG');
      app = cluster('apps/master-worker-started');
      // app.debug();

      await app.expect('stdout', /egg start/)
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
      app.expect('stdout', /INFO \d+ \[master\] master is killed by signal SIGTERM, closing/);
      app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
      app.expect('stdout', /\[master\] process info: heap_limit \d+, heap_used \d+/);
      app.expect('stdout', /DEBUG \d+ \[master\] close done, exiting with code:0/);
      app.expect('stdout', /INFO \d+ \[master\] exit with code:0/);
      app.expect('stdout', /INFO \d+ \[app_worker\] receive signal SIGTERM, exiting with code:0/);
      app.expect('stdout', /INFO \d+ \[agent_worker\] receive signal SIGTERM, exiting with code:0/);
      app.notExpect('stderr', /\[app_worker\] receive disconnect event in cluster fork mode/);
      app.notExpect('stderr', /\[agent_worker\] receive disconnect event /);
      app.expect('stdout', /INFO \d+ \[app_worker\] exit with code:0/);
      app.expect('stdout', /INFO \d+ \[agent_worker\] exit with code:0/);
      app.expect('stdout', /INFO \d+ \[master\] wait 5000ms/);
    });

    it('master kill by SIGKILL and agent, app worker exit too', async () => {
      mm.env('local');
      app = cluster('apps/master-worker-started');
      // app.debug();

      await app.expect('stdout', /egg start/)
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
      app.notExpect('stdout', /\[master\] master is killed by signal SIGTERM, closing/);
      app.notExpect('stdout', /\[master\] close done, exiting with code:0/);
      app.notExpect('stdout', /\[master\] exit with code:0/);
      app.expect('stderr', /\[app_worker\] receive disconnect event /);
      app.expect('stderr', /\[agent_worker\] receive disconnect event /);
      app.expect('stderr', /\[agent_worker\] exit with code:110/);
    });

    it('master kill by SIGKILL and exit multi workers', async () => {
      mm.env('local');
      app = cluster('apps/master-worker-started', { workers: 4 });
      // app.debug();

      await app.expect('stdout', /egg start/)
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
      app.notExpect('stdout', /\[master\] master is killed by signal SIGTERM, closing/);
      app.notExpect('stdout', /\[master\] close done, exiting with code:0/);
      app.notExpect('stdout', /\[master\] exit with code:0/);
      app.expect('stderr', /\[app_worker\] receive disconnect event /);
      app.expect('stderr', /\[agent_worker\] receive disconnect event /);
      app.expect('stderr', /\[agent_worker\] exit with code:110/);
    });

    it('use SIGTERM close master', async () => {
      mm.env('local');
      app = cluster('apps/master-worker-started');
      // app.debug();

      await app.expect('stdout', /egg start/)
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
      app.expect('stdout', /\[master\] master is killed by signal SIGTERM, closing/);
      app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
      app.expect('stdout', /\[master\] process info: heap_limit \d+, heap_used \d+/);
      app.expect('stdout', /\[master\] exit with code:0/);
    });

    it('use SIGQUIT close master', async () => {
      mm.env('local');
      app = cluster('apps/master-worker-started');
      // app.debug();

      await app.expect('stdout', /egg start/)
        .expect('stdout', /egg started/)
        .expect('code', 0)
        .end();

      app.proc.kill('SIGQUIT');
      await scheduler.wait(6000);

      assert(app.proc.killed === true);
      app.expect('stdout', /\[master\] master is killed by signal SIGQUIT, closing/);
      app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
      app.expect('stdout', /\[master\] process info: heap_limit \d+, heap_used \d+/);
      app.expect('stdout', /\[master\] exit with code:0/);
    });

    it('use SIGINT close master', async () => {
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
      app.expect('stdout', /\[master\] master is killed by signal SIGINT, closing/);
      app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
      app.expect('stdout', /\[master\] process info: heap_limit \d+, heap_used \d+/);
      app.expect('stdout', /\[master\] exit with code:0/);
    });

    it('should close when set EGG_MASTER_CLOSE_TIMEOUT', async () => {
      mm.env('local');
      mm(process.env, 'EGG_APP_WORKER_LOGGER_LEVEL', 'INFO');
      mm(process.env, 'EGG_AGENT_WORKER_LOGGER_LEVEL', 'INFO');
      mm(process.env, 'EGG_MASTER_LOGGER_LEVEL', 'DEBUG');
      mm(process.env, 'EGG_MASTER_CLOSE_TIMEOUT', 1000);
      app = cluster('apps/master-worker-started');
      // app.debug();

      await app.expect('stdout', /egg start/)
        .expect('stdout', /egg started/)
        .expect('code', 0)
        .end();

      app.proc.kill('SIGTERM');
      await scheduler.wait(2000);
      assert(app.proc.killed === true);
      app.expect('stdout', /INFO \d+ \[master\] exit with code:0/);
      app.expect('stdout', /INFO \d+ \[master\] wait 1000ms/);
    });

    it('kill order', async () => {
      mm.env('local');
      mm(process.env, 'EGG_APP_WORKER_LOGGER_LEVEL', 'INFO');
      mm(process.env, 'EGG_AGENT_WORKER_LOGGER_LEVEL', 'INFO');
      mm(process.env, 'EGG_MASTER_LOGGER_LEVEL', 'DEBUG');
      mm(process.env, 'EGG_APP_CLOSE_TIMEOUT', 1000);
      mm(process.env, 'EGG_AGENT_CLOSE_TIMEOUT', 1000);
      app = cluster('apps/worker-close-timeout');

      await app.expect('stdout', /egg start/)
        .expect('stdout', /egg started/)
        .expect('code', 0)
        .end();

      app.proc.kill('SIGTERM');
      await once(app.proc, 'exit');

      app.expect('stdout', /INFO \d+ \[master\] exit with code:0/);
      app.expect('stdout', /INFO \d+ \[master\] wait 1000ms/);
      const appTimeoutMatch = app.stdout.match(/app worker start close: (\d+)/);
      const agentTimeoutMatch = app.stdout.match(/agent worker start close: (\d+)/);
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

      await app.expect('stdout', /egg start/)
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

      app.expect('stdout', /\[master\] master is killed by signal SIGTERM, closing/);
      app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
      app.expect('stdout', /\[master\] process info: heap_limit \d+, heap_used \d+/);
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

      await app.expect('stdout', /egg start/)
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

      app.expect('stdout', /\[master\] master is killed by signal SIGTERM, closing/);
      app.expect('stdout', /\[master\] system memory: total \d+, free \d+/);
      app.expect('stdout', /\[master\] process info: heap_limit \d+, heap_used \d+/);
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

  describe('pid file', () => {
    const runDir = getFilepath('apps/master-worker-started/run');
    const pidFile = path.join(runDir, './pid');

    beforeEach(() => rm(runDir, { force: true, recursive: true }));
    afterEach(() => app.close());

    it('master should write pid file and delete', async () => {
      app = cluster('apps/master-worker-started', { pidFile } as any);
      // app.debug();

      await app.expect('stdout', /egg start/)
        .expect('stdout', /egg started/)
        .expect('code', 0)
        .end();

      assert(fs.existsSync(pidFile));
      const pid = fs.readFileSync(pidFile, 'utf-8');
      assert(pid === String(app.process.pid));

      app.proc.kill('SIGTERM');
      await scheduler.wait(6000);
      app.expect('stdout', /\[master\] exit with code:0/);
      assert(!fs.existsSync(pidFile));
    });

    it('master should ignore fail when delete pid file ', async () => {
      app = cluster('apps/master-worker-started', { pidFile } as any);
      // app.debug();

      await app.expect('stdout', /egg start/)
        .expect('stdout', /egg started/)
        .expect('code', 0)
        .end();

      assert(fs.existsSync(pidFile));
      const pid = fs.readFileSync(pidFile, 'utf-8');
      assert(pid === String(app.process.pid));

      // delete
      fs.unlinkSync(pidFile);

      app.proc.kill('SIGTERM');
      await scheduler.wait(6000);
      app.expect('stdout', /\[master\] exit with code:0/);
      assert(!fs.existsSync(pidFile));
    });
  });

  describe('Messenger', () => {
    afterEach(() => app.close());

    it('parent -> app/agent', async () => {
      app = cluster('apps/messenger');
      // app.debug();

      await app.ready();

      app.proc.send({
        action: 'parent2app',
        data: 'parent -> app',
        to: 'app',
      });
      app.proc.send({
        action: 'parent2agent',
        data: 'parent -> agent',
        to: 'agent',
      });

      await scheduler.wait(1000);
      app.expect('stdout', /parent -> agent/);
      app.expect('stdout', /parent -> app/);
    });

    it('should app <-> agent', async () => {
      app = cluster('apps/messenger');
      // app.debug();
      await app.ready();

      await scheduler.wait(1000);
      app.expect('stdout', /app -> agent/);
      app.expect('stdout', /agent -> app/);
      app.expect('stdout', /app: agent2appbystring/);
      app.expect('stdout', /agent: app2agentbystring/);
    });

    it('should send multi app worker', async () => {
      app = cluster('apps/send-to-multiapp', { workers: 4 });
      // app.debug();
      await app.ready();
      await scheduler.wait(1000);
      app.expect('stdout', /\d+ '?got'?/);
    });

    it('sendTo should work', async () => {
      app = cluster('apps/messenger');
      // app.debug();
      await app.ready();
      app.proc.on('message', console.log);
      await scheduler.wait(1000);
      app.expect('stdout', /app sendTo agent done/);
      app.expect('stdout', /agent sendTo agent done/);
      app.expect('stdout', /app sendTo app done/);
      app.expect('stdout', /agent sendTo app done/);
    });

    // it('egg-script exit', async () => {
    //   app = {
    //     close: async () => {
    //       await scheduler.wait(1);
    //     },
    //   } as any;
    //   const appDir = path.join(__dirname, 'fixtures/apps/script-start');
    //   const errLogPath = path.join(appDir, 'stderr.log');
    //   const errFd = fs.openSync(errLogPath, 'w+');
    //   const p = cp.fork(path.join(appDir, 'start-server.js'), {
    //     stdio: [
    //       'ignore',
    //       'ignore',
    //       errFd,
    //       'ipc',
    //     ],
    //   });
    //   let masterPid;
    //   p.on('message', msg => {
    //     masterPid = msg;
    //   });
    //   await scheduler.wait(10000);
    //   process.kill(masterPid);
    //   process.kill(p.pid);
    //   fs.closeSync(errFd);
    //   const stderr = fs.readFileSync(errLogPath).toString();
    //   assert(!/channel closed/.test(stderr));
    // });
  });

  describe('--cluster', () => {
    before(() => {
      app = cluster('apps/cluster_mod_app');
      return app.ready();
    });
    after(() => app.close());

    it('should online cluster mode startup success', () => {
      return app.httpRequest()
        .get('/portal/i.htm')
        .expect('hi cluster')
        .expect(200);
    });
  });

  describe('framework start', () => {
    let app: MockApplication;

    afterEach(() => app.close());

    before(() => {
      mm.env('prod');
      app = cluster('apps/frameworkapp', {
        framework: getFilepath('apps/frameworkbiz'),
      });
      return app.ready();
    });

    it('should start with prod env', () => {
      return app.httpRequest()
        .get('/')
        .expect({
          frameworkCore: true,
          frameworkPlugin: true,
          frameworkAgent: true,
        })
        .expect(200);
    });
  });

  describe('reload worker', () => {
    let app: MockApplication;

    after(() => app.close());

    before(() => {
      app = cluster('apps/reload-worker', {
        workers: 4,
      });
      // app.debug();
      return app.ready();
    });

    it('should restart 4 workers', async () => {
      app.process.send({
        to: 'master',
        action: 'reload-worker',
      });
      await scheduler.wait(5000);
      app.expect('stdout', /app_worker#4:\d+ disconnect/);
      app.expect('stdout', /app_worker#8:\d+ started/);
    });
  });

  describe('after started', () => {
    let app: MockApplication;
    let readyMsg: string;

    before(() => {
      mm.env('default');
      app = cluster('apps/egg-ready');
      // app.debug();
      setTimeout(() => {
        app.proc.on('message', (msg: any) => {
          if (msg.to === 'parent' && msg.action === 'egg-ready') {
            readyMsg = `parent: port=${msg.data.port}, address=${msg.data.address}`;
          }
        });
      }, 1);
      return app.ready();
    });
    after(() => app.close());

    it('app/agent should receive egg-ready', async () => {
      // work for message sent
      await scheduler.wait(5000);
      assert(readyMsg.match(/parent: port=\d+, address=http:\/\/127.0.0.1:\d+/));
      app.expect('stdout', /agent receive egg-ready, with 1 workers/);
      app.expect('stdout', /app receive egg-ready, worker 1/);
    });

    it('should receive egg-ready when app restart', async () => {
      await app.httpRequest()
        .get('/exception-app')
        .expect(200);

      await scheduler.wait(5000);
      app.expect('stdout', /app receive egg-ready, worker 2/);
    });

    it('should receive egg-ready when agent restart', async () => {
      await app.httpRequest()
        .get('/exception-agent')
        .expect(200);

      await scheduler.wait(5000);

      const matched = app.stdout.match(/agent receive egg-ready/g);
      assert(matched.length === 2);
    });
  });

  describe('agent should receive app worker numbers', () => {
    let app: MockApplication;
    before(() => {
      mm.env('default');
      app = cluster('apps/pid', { workers: 2 });
      // app.debug();
      return app.ready();
    });
    after(() => app.close());

    it('should every app worker will get message', async () => {
      await scheduler.wait(1000);
      // start two workers
      app.expect('stdout', /#1 agent get 1 workers \[ \d+ \]/);
      app.expect('stdout', /#2 agent get 2 workers \[ \d+, \d+ \]/);
    });

    it('agent should get update message after app died', async () => {
      try {
        await app.httpRequest()
          .get('/exit');
      } catch (_) {
        // ignore
      }

      await scheduler.wait(9000);
      // oh, one worker dead
      app.expect('stdout', /#3 agent get 1 workers \[ \d+ \]/);
      // never mind, fork new worker
      app.expect('stdout', /#4 agent get 2 workers \[ \d+, \d+ \]/);
    });

    it('agent should get message when agent restart', async () => {
      app.process.send({
        to: 'agent',
        action: 'kill-agent',
      });

      await scheduler.wait(9000);
      app.expect('stdout', /#1 agent get 2 workers \[ \d+, \d+ \]/);
    });
  });

  describe('app should receive agent worker numbers', () => {
    let app: MockApplication;
    before(() => {
      mm.env('default');
      app = cluster('apps/pid');
      app.coverage(false);
      // app.debug();
      return app.ready();
    });
    after(() => app.close());

    it('agent start should get message', async () => {
      app.process.send({
        to: 'agent',
        action: 'kill-agent',
      });

      await scheduler.wait(5000);
      app.expect('stdout', /#1 app get 1 workers \[/);
      app.expect('stdout', /#2 app get 0 workers \[/);
    });
  });

  describe('debug', () => {
    let app: MockApplication;
    afterEach(() => app.close());

    // Debugger listening on ws://127.0.0.1:9229/221caad4-e2d0-4630-b0bb-f7fb27b81ff6
    const debugProtocol = 'inspect';

    it('should debug', () => {
      app = cluster('apps/debug-port', {
        workers: 2,
        opt: { execArgv: [ `--${debugProtocol}` ] },
      });

      return app
        // .debug()
        .coverage(false)
        // master
        .expect('stderr', /Debugger listening on .*:(5858|9229)/)
        // agent
        .expect('stderr', /Debugger listening on .*:5800/)
        .expect('stdout', /debug port of agent is 5800/)
        // worker#1
        .expect('stderr', /Debugger listening on .*:(5859|9230)/)
        .expect('stdout', /debug port of app is (5859|9230)/)
        // worker#2
        .expect('stderr', /Debugger listening on .*:(5860|9231)/)
        .expect('stdout', /debug port of app is (5860|9231)/)
        .end();
    });

    it('should debug with port', () => {
      app = cluster('apps/debug-port', {
        workers: 2,
        opt: { execArgv: [ `--${debugProtocol}=9000` ] },
      });

      return app
        // .debug()
        .coverage(false)
        // master
        .expect('stderr', /Debugger listening on .*:9000/)
        // agent
        .expect('stderr', /Debugger listening on .*:5800/)
        .expect('stdout', /debug port of agent is 5800/)
        // worker#1
        .expect('stderr', /Debugger listening on .*:9001/)
        .expect('stdout', /debug port of app is 9001/)
        // worker#2
        .expect('stderr', /Debugger listening on .*:9002/)
        .expect('stdout', /debug port of app is 9002/)
        .end();
    });

    describe('debug message', () => {
      const result: any = { app: [], agent: {} };

      after(() => app.close());

      before(() => {
        app = cluster('apps/egg-ready', {
          workers: 2,
          opt: { execArgv: [ `--${debugProtocol}` ] },
        });
        // app.debug();
        setTimeout(() => {
          app.proc.on('message', (msg: any) => {
            if (msg.to === 'parent' && msg.action === 'debug') {
              if (msg.from === 'agent') {
                result.agent = msg.data;
              } else {
                result.app.push(msg.data);
              }
            }
          });
        }, 1);
        return app.ready();
      });

      it('parent should receive debug', async () => {
        // work for message sent
        await scheduler.wait(5000);
        app.expect('stdout', /agent receive egg-ready, with 2 workers/);
        app.expect('stdout', /app receive egg-ready/);
        assert(result.agent.debugPort === 5800);
        assert(result.app.length === 2);
        assert(result.app[0].pid);
        assert(result.app[0].debugPort === 5859 || result.app[0].debugPort === 9230);
        assert(result.app[1].debugPort === 5860 || result.app[1].debugPort === 9231);
      });
    });

    describe('debug message with port', () => {
      const result: any = { app: [], agent: {} };

      after(() => app.close());

      before(() => {
        app = cluster('apps/egg-ready', { workers: 2, opt: { execArgv: [ `--${debugProtocol}=9000` ] } });
        // app.debug();
        setTimeout(() => {
          app.proc.on('message', (msg: any) => {
            if (msg.to === 'parent' && msg.action === 'debug') {
              if (msg.from === 'agent') {
                result.agent = msg.data;
              } else {
                result.app.push(msg.data);
              }
            }
          });
        }, 1);
        return app.ready();
      });

      it('parent should receive debug', async () => {
        // work for message sent
        await scheduler.wait(5000);
        app.expect('stdout', /agent receive egg-ready, with 2 workers/);
        app.expect('stdout', /app receive egg-ready/);
        assert(result.agent.debugPort === 5800);
        assert(result.app.length === 2);
        assert(result.app[0].debugPort && result.app[0].pid);
        assert(result.app[0].debugPort === 9001);
        assert(result.app[1].debugPort === 9002);
      });
    });

    describe('should not debug message', () => {
      let result: boolean;

      after(() => app.close());

      before(() => {
        app = cluster('apps/egg-ready');
        // app.debug();
        setTimeout(() => {
          app.proc.on('message', (msg: any) => {
            if (msg.to === 'parent' && msg.action === 'debug') {
              result = true;
            }
          });
        }, 1);
        return app.ready();
      });

      it('parent should not receive debug', async () => {
        // work for message sent
        await scheduler.wait(5000);
        app.expect('stdout', /agent receive egg-ready, with 1 workers/);
        app.expect('stdout', /app receive egg-ready/);
        assert(!result);
      });
    });

    describe('kill at debug', () => {
      let workerPid: number;

      after(() => app.close());

      before(() => {
        app = cluster('apps/egg-ready', { workers: 1, opt: { execArgv: [ `--${debugProtocol}` ] } });
        // app.debug();
        setTimeout(() => {
          app.proc.on('message', (msg: any) => {
            if (msg.to === 'parent' && msg.action === 'debug' && msg.from === 'app') {
              workerPid = msg.data.pid;
            }
            if (msg.action === 'egg-ready') {
              process.kill(workerPid, 'SIGKILL');
            }
          });
        }, 1);
        return app.ready();
      });

      it('should not log error', async () => {
        // work for message sent
        await scheduler.wait(6000);
        app.expect('stderr', /\[master] app_worker#.*signal: SIGKILL/);
        app.expect('stderr', /\[master] worker kill by debugger, exiting/);
        app.expect('stdout', /\[master] exit with code:0/);
        app.notExpect('stderr', /AppWorkerDiedError/);
      });
    });
  });

  describe('--sticky', () => {
    before(() => {
      app = cluster('apps/cluster_mod_sticky', { sticky: true, port: 17010 } as any);
      app.debug();
      return app.ready();
    });
    after(() => app.close());

    it('should online sticky cluster mode startup success', () => {
      app.expect('stdout', /app_worker#\d:\d+ started at (?!9500)/);
      app.expect('stdout', /egg started on http:\/\/127.0.0.1:17010/);
      return request('http://127.0.0.1:17010')
        .get('/portal/i.htm')
        .expect('hi cluster')
        .expect(200);
    });
  });

  describe('agent and worker exception', () => {
    it('should not exit when local env', async () => {
      mm.env('local');
      app = cluster('apps/check-status');
      // app.debug();
      await app.ready();
      fs.writeFileSync(path.join(app.baseDir, 'logs/started'), '');

      await scheduler.wait(5000);

      // process should exist
      assert(app.process.exitCode === null);
      app.process.kill('SIGINT');
    });

    it('should exit when no agent after check 3 times', async () => {
      mm.env('prod');
      app = cluster('apps/check-status');
      // app.debug();
      await app.ready();
      fs.mkdirSync(path.join(app.baseDir, 'logs'), { recursive: true });
      fs.writeFileSync(path.join(app.baseDir, 'logs/started'), '');

      // kill agent worker and will exit when start
      app.process.send({ to: 'agent', action: 'kill' });

      await once(app.proc, 'exit');

      assert(app.stderr.includes('nodejs.ClusterWorkerExceptionError: [master] 0 agent and 1 worker(s) alive, exit to avoid unknown state'));
      assert(app.stderr.includes('[master] exit with code:1'));
    });

    it('should exit when no app after check 3 times', async () => {
      mm.env('prod');
      app = cluster('apps/check-status');
      // app.debug();
      await app.ready();
      fs.mkdirSync(path.join(app.baseDir, 'logs'), { recursive: true });
      fs.writeFileSync(path.join(app.baseDir, 'logs/started'), '');

      // kill app worker and wait checking
      app.process.send({ to: 'app', action: 'kill' });

      await once(app.proc, 'exit');

      assert(app.stderr.includes('nodejs.ClusterWorkerExceptionError: [master] 1 agent and 0 worker(s) alive, exit to avoid unknown state'));
      assert(app.stderr.includes('[master] exit with code:1'));
    });
  });

  describe('beforeClose', () => {
    it('should wait app close', async () => {
      mm.env('local');
      app = cluster('apps/before-close');
      // app.debug();
      await app.ready();

      await app.close();
      await scheduler.wait(5000);

      app.expect('stdout', /app closing/);
      app.expect('stdout', /app closed/);
      app.expect('stdout', /agent closing/);
      app.expect('stdout', /agent closed/);
    });
  });

  describe('--require', () => {
    describe('one', () => {
      before(() => {
        app = cluster('apps/options-require', {
          require: getFilepath('apps/options-require/inject.js'),
        } as any);
        // app.debug();
        return app.ready();
      });
      after(() => app.close());

      it('should inject', () => {
        app.expect('stdout', /### inject application/);
        app.expect('stdout', /### inject agent/);
      });
    });
    describe('array', () => {
      before(() => {
        app = cluster('apps/options-require', {
          require: [
            getFilepath('apps/options-require/inject.js'),
            'ts-node/register',
          ],
        } as any);
        // app.debug();
        return app.ready();
      });
      after(() => app.close());

      it('should inject', () => {
        app.expect('stdout', /### inject application/);
        app.expect('stdout', /### inject agent/);
        app.expect('stdout', /### inject ts-node\/register at app/);
        app.expect('stdout', /### inject ts-node\/register at agent/);
      });
    });
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
