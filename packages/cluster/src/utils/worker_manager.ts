import { EventEmitter } from "node:events";

import { BaseAgentWorker } from "./mode/base/agent.ts";
import { BaseAppWorker } from "./mode/base/app.ts";

// worker manager to record agent and worker forked by egg-cluster
// can do some check stuff here to monitor the healthy
export class WorkerManager extends EventEmitter {
  agent: BaseAgentWorker | null;
  workers: Map<number, BaseAppWorker> = new Map<number, BaseAppWorker>();
  exception = 0;
  timer: NodeJS.Timeout;

  constructor() {
    super();
    this.agent = null;
  }

  getWorkers(): number[] {
    return Array.from(this.workers.keys());
  }

  setAgent(agent: BaseAgentWorker): void {
    this.agent = agent;
  }

  getAgent(): BaseAgentWorker | null {
    return this.agent;
  }

  deleteAgent(): void {
    this.agent = null;
  }

  setWorker(worker: BaseAppWorker): void {
    this.workers.set(worker.workerId, worker);
  }

  getWorker(workerId: number): BaseAppWorker | undefined {
    return this.workers.get(workerId);
  }

  deleteWorker(workerId: number): void {
    this.workers.delete(workerId);
  }

  listWorkerIds(): number[] {
    return Array.from(this.workers.keys());
  }

  listWorkers(): BaseAppWorker[] {
    return Array.from(this.workers.values());
  }

  getListeningWorkerIds(): number[] {
    const keys = [];
    for (const [id, worker] of this.workers.entries()) {
      if (worker.state === "listening") {
        keys.push(id);
      }
    }
    return keys;
  }

  count(): { agent: number; worker: number } {
    return {
      agent: this.agent?.status === "started" ? 1 : 0,
      worker: this.listWorkerIds().length,
    };
  }

  // check agent and worker must both alive
  // if exception appear 3 times, emit an exception event
  startCheck(): void {
    this.timer = setInterval(() => {
      const count = this.count();
      if (count.agent > 0 && count.worker > 0) {
        this.exception = 0;
        return;
      }
      this.exception++;
      if (this.exception >= 3) {
        this.emit("exception", count);
        clearInterval(this.timer);
      }
    }, 10000);
  }
}
