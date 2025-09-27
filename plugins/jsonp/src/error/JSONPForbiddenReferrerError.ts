export class JSONPForbiddenReferrerError extends Error {
  referrer: string;
  status: number;

  constructor(message: string, referrer: string, status: number) {
    super(message);
    this.name = this.constructor.name;
    this.referrer = referrer;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}
