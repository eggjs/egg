import { scheduler } from 'node:timers/promises';

import { describe, it, afterEach } from 'vitest';
import { mm, MockApplication } from '@eggjs/mock';

import { cluster } from '../utils.ts';

let app: MockApplication;

afterEach(mm.restore);

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
    // app.expect('stdout', /agent -> app/);
    // app.expect('stdout', /app: agent2appbystring/);
    // app.expect('stdout', /agent: app2agentbystring/);
  });

  it.skip('should send multi app worker', async () => {
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
    // app.proc.on('message', console.log);
    await scheduler.wait(1000);
    // app.expect('stdout', /app sendTo agent done/);
    // app.expect('stdout', /agent sendTo agent done/);
    // app.expect('stdout', /app sendTo app done/);
    // app.expect('stdout', /agent sendTo app done/);
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
