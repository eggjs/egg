/**
 * Error thrown when a thread or run is not found.
 * The `status` property is recognized by Koa/Egg error handling
 * to set the corresponding HTTP response status code.
 */
export class AgentNotFoundError extends Error {
  status: number = 404;

  constructor(message: string) {
    super(message);
    this.name = 'AgentNotFoundError';
  }
}

/**
 * Error thrown when an operation conflicts with the current state
 * (e.g., cancelling a completed run).
 *
 * TODO(PR2): used by AgentRuntime.cancelRun() — remove this comment after PR2 lands
 */
export class AgentConflictError extends Error {
  status: number = 409;

  constructor(message: string) {
    super(message);
    this.name = 'AgentConflictError';
  }
}
