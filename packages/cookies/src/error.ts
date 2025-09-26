export class CookieError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    if ('captureStackTrace' in Error) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
