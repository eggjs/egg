export class MessageUnhandledRejectionError extends Error {
  event: string | symbol;
  args: any[];

  constructor(err: Error, event: string | symbol, ...args: any[]) {
    super(`event: ${String(event)}, error: ${err.message}`, { cause: err });
    this.name = this.constructor.name;
    this.event = event;
    this.args = args;
    Error.captureStackTrace(this, this.constructor);
  }
}
