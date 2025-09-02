import path from 'node:path';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { scheduler } from 'node:timers/promises';
import { once } from 'node:events';

import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';
import { request } from '@eggjs/supertest';
import { mm, MockApplication } from '@eggjs/mock';

import { cluster, getFilepath } from '../utils.ts';

let app: MockApplication;

afterEach(mm.restore);

describe('--cluster', () => {
  beforeAll(() => {
    app = cluster('apps/cluster_mod_app');
    return app.ready();
  });
  afterAll(() => app.close());

  it('should online cluster mode startup success', () => {
    return app
      .httpRequest()
      .get('/portal/i.htm')
      .expect('hi cluster')
      .expect(200);
  });
});

describe.skip('framework start', () => {
  let app: MockApplication;

  afterEach(() => app.close());

  beforeAll(() => {
    mm.env('prod');
    app = cluster('apps/frameworkapp', {
      framework: getFilepath('apps/frameworkbiz'),
    });
    return app.ready();
  });

  it('should start with prod env', () => {
    return app
      .httpRequest()
      .get('/')
      .expect({
        frameworkCore: true,
        frameworkPlugin: true,
        frameworkAgent: true,
      })
      .expect(200);
  });
});

describe.skip('reload worker', () => {
  let app: MockApplication;

  afterAll(() => app.close());

  beforeAll(() => {
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

describe.skip('agent should receive app worker numbers', () => {
  let app: MockApplication;
  beforeAll(() => {
    mm.env('default');
    app = cluster('apps/pid', { workers: 2 });
    // app.debug();
    return app.ready();
  });
  afterAll(() => app.close());

  it('should every app worker will get message', async () => {
    await scheduler.wait(1000);
    // start two workers
    app.expect('stdout', /#1 agent get 1 workers \[ \d+ \]/);
    app.expect('stdout', /#2 agent get 2 workers \[ \d+, \d+ \]/);
  });

  it.skip('agent should get update message after app died', async () => {
    try {
      await app.httpRequest().get('/exit');
    } catch (_) {
      // ignore
    }

    await scheduler.wait(9000);
    // oh, one worker dead
    app.expect('stdout', /#3 agent get 1 workers \[ \d+ \]/);
    // never mind, fork new worker
    app.expect('stdout', /#4 agent get 2 workers \[ \d+, \d+ \]/);
  });

  it.skip('agent should get message when agent restart', async () => {
    app.process.send({
      to: 'agent',
      action: 'kill-agent',
    });

    await scheduler.wait(9000);
    // app.expect('stdout', /#1 agent get 2 workers \[ \d+, \d+ \]/);
  });
});

describe.skip('app should receive agent worker numbers', () => {
  let app: MockApplication;
  beforeAll(() => {
    mm.env('default');
    app = cluster('apps/pid');
    app.coverage(false);
    // app.debug();
    return app.ready();
  });
  afterAll(() => app.close());

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

describe.skip('debug', () => {
  let app: MockApplication;
  afterEach(() => app.close());

  // Debugger listening on ws://127.0.0.1:9229/221caad4-e2d0-4630-b0bb-f7fb27b81ff6
  const debugProtocol = 'inspect';

  it('should debug', () => {
    app = cluster('apps/debug-port', {
      workers: 2,
      opt: { execArgv: [`--${debugProtocol}`] },
    });

    return (
      app
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
        .end()
    );
  });

  it('should debug with port', () => {
    app = cluster('apps/debug-port', {
      workers: 2,
      opt: { execArgv: [`--${debugProtocol}=9000`] },
    });

    return (
      app
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
        .end()
    );
  });

  describe('debug message', () => {
    const result: any = { app: [], agent: {} };

    afterAll(() => app.close());

    beforeAll(() => {
      app = cluster('apps/egg-ready', {
        workers: 2,
        opt: { execArgv: [`--${debugProtocol}`] },
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
      assert(
        result.app[0].debugPort === 5859 || result.app[0].debugPort === 9230
      );
      assert(
        result.app[1].debugPort === 5860 || result.app[1].debugPort === 9231
      );
    });
  });

  describe('debug message with port', () => {
    const result: any = { app: [], agent: {} };

    afterAll(() => app.close());

    beforeAll(() => {
      app = cluster('apps/egg-ready', {
        workers: 2,
        opt: { execArgv: [`--${debugProtocol}=9000`] },
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
      assert(result.app[0].debugPort && result.app[0].pid);
      assert(result.app[0].debugPort === 9001);
      assert(result.app[1].debugPort === 9002);
    });
  });

  describe('should not debug message', () => {
    let result: boolean;

    afterAll(() => app.close());

    beforeAll(() => {
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

    afterAll(() => app.close());

    beforeAll(() => {
      app = cluster('apps/egg-ready', {
        workers: 1,
        opt: { execArgv: [`--${debugProtocol}`] },
      });
      // app.debug();
      setTimeout(() => {
        app.proc.on('message', (msg: any) => {
          if (
            msg.to === 'parent' &&
            msg.action === 'debug' &&
            msg.from === 'app'
          ) {
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
  beforeAll(() => {
    app = cluster('apps/cluster_mod_sticky', {
      sticky: true,
      port: 17010,
    } as any);
    app.debug();
    return app.ready();
  });
  afterAll(() => app.close());

  it('should online sticky cluster mode startup success', () => {
    app.expect('stdout', /app_worker#\d:\d+ started at (?!9500)/);
    app.expect('stdout', /egg started on http:\/\/127.0.0.1:17010/);
    return request('http://127.0.0.1:17010')
      .get('/portal/i.htm')
      .expect('hi cluster')
      .expect(200);
  });
});

describe.skip('agent and worker exception', () => {
  it('should not exit when local env', async () => {
    mm.env('local');
    app = cluster('apps/check-status');
    // app.debug();
    await app.ready();
    fs.writeFileSync(path.join(app.baseDir, 'logs/started'), '');

    await scheduler.wait(5000);

    // process should exist
    assert.equal(app.process.exitCode, null);
    app.process.kill('SIGINT');
  });

  it.skip('should exit when no agent after check 3 times', async () => {
    mm.env('prod');
    app = cluster('apps/check-status');
    // app.debug();
    await app.ready();
    fs.mkdirSync(path.join(app.baseDir, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(app.baseDir, 'logs/started'), '');

    // kill agent worker and will exit when start
    app.process.send({ to: 'agent', action: 'kill' });

    await once(app.proc, 'exit');

    assert(
      app.stderr.includes(
        'nodejs.ClusterWorkerExceptionError: [master] 0 agent and 1 worker(s) alive, exit to avoid unknown state'
      )
    );
    assert(app.stderr.includes('[master] exit with code:1'));
  });

  it.skip('should exit when no app after check 3 times', async () => {
    mm.env('prod');
    app = cluster('apps/check-status');
    // app.debug();
    await app.ready();
    fs.mkdirSync(path.join(app.baseDir, 'logs'), { recursive: true });
    fs.writeFileSync(path.join(app.baseDir, 'logs/started'), '');

    // kill app worker and wait checking
    app.process.send({ to: 'app', action: 'kill' });

    await once(app.proc, 'exit');

    assert(
      app.stderr.includes(
        'nodejs.ClusterWorkerExceptionError: [master] 1 agent and 0 worker(s) alive, exit to avoid unknown state'
      )
    );
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

describe.skip('--require', () => {
  describe('one', () => {
    beforeAll(() => {
      app = cluster('apps/options-require', {
        require: getFilepath('apps/options-require/inject.js'),
      } as any);
      // app.debug();
      return app.ready();
    });
    afterAll(() => app.close());

    it('should inject', () => {
      app.expect('stdout', /### inject application/);
      app.expect('stdout', /### inject agent/);
    });
  });

  describe('array', () => {
    beforeAll(() => {
      app = cluster('apps/options-require', {
        require: [
          getFilepath('apps/options-require/inject.js'),
          'ts-node/register',
        ],
      } as any);
      // app.debug();
      return app.ready();
    });
    afterAll(() => app.close());

    it('should inject', () => {
      app.expect('stdout', /### inject application/);
      app.expect('stdout', /### inject agent/);
      app.expect('stdout', /### inject ts-node\/register at app/);
      app.expect('stdout', /### inject ts-node\/register at agent/);
    });
  });
});
