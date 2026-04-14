import type { Application } from 'egg';

export default (app: Application): void => {
  app.get('/', async (ctx) => {
    ctx.body = { ok: true };
  });
};
