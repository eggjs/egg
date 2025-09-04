export class AssertError extends Error {
  expected: any;
  actual: any;

  constructor(message: string, expected: any, actual: any, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.expected = expected;
    this.actual = actual;
    Error.captureStackTrace(this, this.constructor);
  }
}
