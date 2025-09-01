import workerThreads, { type Worker } from 'node:worker_threads';
import { type Options as gracefulExitOptions } from 'graceful-process';
import { BaseAgentUtils, BaseAgentWorker } from '../../base/agent.js';
import type { MessageBody } from '../../../messenger.js';
import { ClusterAgentWorkerError } from '../../../../error/ClusterAgentWorkerError.js';

export class AgentThreadWorker extends BaseAgentWorker<Worker> {
  get workerId() {
    return this.instance.threadId;
  }

  send(message: MessageBody) {
    this.instance.postMessage(message);
  }

  static send(message: MessageBody) {
    message.senderWorkerId = String(workerThreads.threadId);
    workerThreads.parentPort!.postMessage(message);
  }

  static kill() {
    // in worker_threads, process.exit
    // does not stop the whole program, just the single thread
    process.exit(1);
  }

  static gracefulExit(options: gracefulExitOptions) {
    const { beforeExit } = options;
    process.on('exit', async code => {
      if (typeof beforeExit === 'function') {
        await beforeExit();
      }
      process.exit(code);
    });
  }
}

export class AgentThreadUtils extends BaseAgentUtils {
  #worker: Worker;
  #id = 0;
  instance: AgentThreadWorker;

  fork() {
    this.startTime = Date.now();

    // start agent worker
    const argv = [ JSON.stringify(this.options) ];
    const agentPath = this.getAgentWorkerFile();
    const worker = this.#worker = new workerThreads.Worker(agentPath, { argv });

    // wrap agent worker
    const agentWorker = this.instance = new AgentThreadWorker(worker);
    this.emit('agent_forked', agentWorker);
    agentWorker.status = 'starting';
    agentWorker.id = ++this.#id;
    this.log('[master] agent_worker#%s:%s start with worker_threads',
      agentWorker.id, agentWorker.workerId);

    worker.on('message', msg => {
      if (typeof msg === 'string') {
        msg = {
          action: msg,
          data: msg,
        };
      }
      msg.from = 'agent';
      this.messenger.send(msg);
    });

    worker.on('error', err => {
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

  clean() {
    this.#worker.removeAllListeners();
  }

  async kill() {
    if (this.#worker) {
      this.log(`[master] kill agent worker#${this.#id} (worker_threads) by worker.terminate()`);
      this.clean();
      await this.#worker.terminate();
    }
  }
}
