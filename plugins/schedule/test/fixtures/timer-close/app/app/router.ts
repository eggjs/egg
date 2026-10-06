import type { Application } from 'egg';

export default (app: Application): void => {
  app.get('/', (ctx) => {
    ctx.body = { ready: true };
  });
};
