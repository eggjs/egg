import type { MiddlewareFunc } from '@eggjs/core';
import type { Application } from 'egg';

export default (app: Application): void => {
  const index: MiddlewareFunc = async (ctx) => {
    ctx.body = { ok: true };
  };
  app.get('/', index);
};
