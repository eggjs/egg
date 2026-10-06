/**
 * Error thrown when a thread or run is not found.
 * The `status` property is recognized by Koa/Egg error handling
 * to set the corresponding HTTP response status code.
 */
export class AgentNotFoundError extends Error {
  status = 404;

  constructor(message: string) {
    super(message);
    this.name = 'AgentNotFoundError';
  }
}

/**
 * Error thrown when an agent API request contains invalid input.
 */
export class AgentInvalidRequestError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'AgentInvalidRequestError';
  }
}

/**
 * Error thrown when an operation conflicts with the current state
 * (e.g., cancelling a completed run).
 */
export class AgentConflictError extends Error {
  status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'AgentConflictError';
  }
}

/**
 * Error thrown when a RunBuilder state transition is invalid
 * (e.g., calling `complete()` on a queued run).
 */
export class InvalidRunStateTransitionError extends Error {
  status = 409;

  constructor(from: string, to: string) {
    super(`Invalid run state transition: '${from}' -> '${to}'`);
    this.name = 'InvalidRunStateTransitionError';
  }
}

/**
 * Error thrown when cancelRun waits for the executor's session to be
 * committed to persistent storage (e.g. Claude Code SDK jsonl on disk)
 * but the commit never arrives within the configured timeout. The run is
 * transitioned to `failed` rather than `cancelled` to reflect that the
 * executor never reached a resumable state.
 */
export class AgentTimeoutError extends Error {
  status = 408;

  constructor(message: string) {
    super(message);
    this.name = 'AgentTimeoutError';
  }
}
