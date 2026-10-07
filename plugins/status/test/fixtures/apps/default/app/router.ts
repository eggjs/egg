import type { Application } from 'egg';

export default (app: Application): void => {
  app.router.get('/', (ctx) => {
    ctx.body = 'home';
  });
  app.router.get('/egg.status/extra', (ctx) => {
    ctx.body = 'other route';
  });
};
