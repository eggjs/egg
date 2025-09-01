import { EventEmitter } from 'node:events';
import { BaseAgentWorker } from './mode/base/agent.js';
import { BaseAppWorker } from './mode/base/app.js';

// worker manager to record agent and worker forked by egg-cluster
// can do some check stuff here to monitor the healthy
export class WorkerManager extends EventEmitter {
  agent: BaseAgentWorker | null;
  workers = new Map<number, BaseAppWorker>();
  exception = 0;
  timer: NodeJS.Timeout;

  constructor() {
    super();
    this.agent = null;
  }

  getWorkers() {
    return Array.from(this.workers.keys());
  }

  setAgent(agent: BaseAgentWorker) {
    this.agent = agent;
  }

  getAgent() {
    return this.agent;
  }

  deleteAgent() {
    this.agent = null;
  }

  setWorker(worker: BaseAppWorker) {
    this.workers.set(worker.workerId, worker);
  }

  getWorker(workerId: number) {
    return this.workers.get(workerId);
  }

  deleteWorker(workerId: number) {
    this.workers.delete(workerId);
  }

  listWorkerIds() {
    return Array.from(this.workers.keys());
  }

  listWorkers() {
    return Array.from(this.workers.values());
  }

  getListeningWorkerIds() {
    const keys = [];
    for (const [ id, worker ] of this.workers.entries()) {
      if (worker.state === 'listening') {
        keys.push(id);
      }
    }
    return keys;
  }

  count() {
    return {
      agent: this.agent?.status === 'started' ? 1 : 0,
      worker: this.listWorkerIds().length,
    };
  }

  // check agent and worker must both alive
  // if exception appear 3 times, emit an exception event
  startCheck() {
    this.timer = setInterval(() => {
      const count = this.count();
      if (count.agent > 0 && count.worker > 0) {
        this.exception = 0;
        return;
      }
      this.exception++;
      if (this.exception >= 3) {
        this.emit('exception', count);
        clearInterval(this.timer);
      }
    }, 10000);
  }
}
