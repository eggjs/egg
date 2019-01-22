import TestMiddleware from './test';

declare module 'egg' {
  interface IMiddleware {
    test: typeof TestMiddleware;
  }
}
