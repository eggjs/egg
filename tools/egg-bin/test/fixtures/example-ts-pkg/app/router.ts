'use strict';

import { Application, Context } from 'egg';

export default (app: Application) => {
  app.router.get('/', async (ctx: Context) => {
    ctx.body = 'hi, egg';
  });
};
