import { strict as assert } from 'node:assert';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { describe, it } from 'vitest';

import { AgentThreadUtils } from '../src/utils/mode/impl/worker_threads/agent.ts';
import { AppThreadUtils } from '../src/utils/mode/impl/worker_threads/app.ts';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const workerFile = fileURLToPath(new URL('./fixtures/thread-shutdown.mjs', import.meta.url));

describe('real worker thread shutdown', () => {
  for (const kind of ['agent', 'app'] as const) {
    it(`${kind} awaits asynchronous cleanup`, async () => {
      const ready = deferred();
      const deps = {
        log() {},
        logger: { error() {} },
        messenger: {
          send(msg: any) {
            if (msg.action === 'ready') ready.resolve();
          },
        },
      };
      const utils =
        kind === 'agent'
          ? new AgentThreadUtils({ agentWorkerFile: workerFile } as any, deps as any)
          : new AppThreadUtils({ appWorkerFile: workerFile, port: 7001, workers: 1 } as any, deps as any);
      utils.fork();
      await ready.promise;
      const started = Date.now();
      await utils.kill(5000);
      assert(Date.now() - started >= 40);
      // kill removes messenger listeners, so verify the exit rather than messages.
      if (kind === 'agent') assert.equal((utils as AgentThreadUtils).instance.instance.threadId, -1);
    });

    it(`${kind} skips exited workers and cannot refork after shutdown`, async () => {
      const ready = deferred();
      const exited = deferred();
      let forks = 0;
      const deps = {
        log() {},
        logger: { error() {} },
        messenger: {
          send(msg: any) {
            if (msg.action === 'ready') ready.resolve();
            if (msg.action === 'agent-exit' || msg.action === 'app-exit') exited.resolve();
          },
        },
      };
      const utils =
        kind === 'agent'
          ? new AgentThreadUtils({ agentWorkerFile: workerFile } as any, deps as any)
          : new AppThreadUtils({ appWorkerFile: workerFile, port: 7001, workers: 1 } as any, deps as any);
      utils.on(kind === 'agent' ? 'agent_forked' : 'worker_forked', (worker) => {
        forks++;
        worker.instance.once('message', () => worker.instance.postMessage({ action: 'exit' }));
      });
      utils.fork();
      await ready.promise;
      await exited.promise;
      const started = Date.now();
      await utils.kill(5000);
      assert(Date.now() - started < 1000);
      utils.fork();
      await sleep(1200);
      assert.equal(forks, 1);
    });
  }
});
