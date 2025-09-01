export class ClusterWorkerExceptionError extends Error {
  count: {
    agent: number;
    worker: number;
  };

  constructor(agent: number, worker: number) {
    const message = `[master] ${agent} agent and ${worker} worker(s) alive, exit to avoid unknown state`;
    super(message);
    this.name = this.constructor.name;
    this.count = {
      agent,
      worker,
    };
    Error.captureStackTrace(this, this.constructor);
  }
}
