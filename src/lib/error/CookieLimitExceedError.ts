export class CookieLimitExceedError extends Error {
  key: string;
  cookie: string;

  constructor(key: string, cookie: string) {
    super(`cookie ${key}'s length(${cookie.length}) exceed the limit(4093)`);
    this.name = this.constructor.name;
    this.key = key;
    this.cookie = cookie;
    Error.captureStackTrace(this, this.constructor);
  }
}
