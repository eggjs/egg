export class ClusterAgentWorkerError extends Error {
  id: number;
  /**
   * pid in process mode
   * tid in worker_threads mode
   */
  workerId: number;
  status: string;

  constructor(id: number, workerId: number, status: string, error: Error) {
    const message = `Got agent worker error: ${error.message}`;
    super(message, { cause: error });
    this.name = this.constructor.name;
    this.id = id;
    this.workerId = workerId;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}
