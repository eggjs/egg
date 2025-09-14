import { Application } from 'egg';

export default (app: Application) => {
  app.get('/foo.js', async ctx => {
    ctx.body = 'foo.js';
  });

  app.get('/foo', async ctx => {
    ctx.body = 'foo';
  });
};
