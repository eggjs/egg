export class LimitError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.status = 413;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
