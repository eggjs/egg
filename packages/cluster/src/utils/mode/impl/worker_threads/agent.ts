import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import workerThreads, { type Worker } from 'node:worker_threads';

import { ClusterAgentWorkerError } from '../../../../error/ClusterAgentWorkerError.ts';
import { WORKER_THREAD_GRACEFUL_EXIT } from '../../../../worker_protocol/worker-thread.ts';
import type { MessageBody } from '../../../messenger.ts';
import { BaseAgentUtils, BaseAgentWorker } from '../../base/agent.ts';

export class AgentThreadWorker extends BaseAgentWorker<Worker> {
  get workerId(): number {
    return this.instance.threadId;
  }

  send(message: MessageBody): void {
    this.instance.postMessage(message);
  }
}

export class AgentThreadUtils extends BaseAgentUtils {
  #worker: Worker;
  #id = 0;
  instance: AgentThreadWorker;

  fork(): void {
    this.startTime = Date.now();

    // start agent worker
    const argv = [JSON.stringify(this.options)];
    const agentPath = this.options.agentWorkerFile || this.getAgentWorkerFile();
    const worker = (this.#worker = new workerThreads.Worker(agentPath, {
      argv,
    }));

    // wrap agent worker
    const agentWorker = (this.instance = new AgentThreadWorker(worker));
    this.emit('agent_forked', agentWorker);
    agentWorker.status = 'starting';
    agentWorker.id = ++this.#id;
    this.log('[master] agent_worker#%s:%s start with worker_threads', agentWorker.id, agentWorker.workerId);

    worker.on('message', (msg) => {
      if (typeof msg === 'string') {
        msg = {
          action: msg,
          data: msg,
        };
      }
      msg.from = 'agent';
      this.messenger.send(msg);
    });

    worker.on('error', (err) => {
      this.logger.error(new ClusterAgentWorkerError(agentWorker.id, agentWorker.workerId, agentWorker.status, err));
    });

    // agent exit message
    worker.once('exit', (code: number, signal: string) => {
      this.messenger.send({
        action: 'agent-exit',
        data: {
          code,
          signal,
        },
        to: 'master',
        from: 'agent',
      });
    });
  }

  clean(): void {
    this.#worker.removeAllListeners();
  }

  async kill(timeout: number): Promise<void> {
    if (this.#worker) {
      this.log(`[master] gracefully close agent worker#${this.#id} (worker_threads)`);
      this.clean();
      const exited = once(this.#worker, 'exit').then(
        () => true,
        () => false,
      );
      this.#worker.postMessage(WORKER_THREAD_GRACEFUL_EXIT);
      if (!(await Promise.race([exited, sleep(timeout).then(() => false)]))) {
        this.log(`[master] terminate agent worker#${this.#id} after ${timeout}ms timeout`);
        await this.#worker.terminate();
      }
    }
  }
}
