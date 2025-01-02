// import { Application } from 'egg';
import { Application } from '../../../../../src/index.js';

export default (app: Application) => {
  const controller = app.controller;
  app.router.get('/test', app.middlewares.test({}, app), controller.foo.getData);
  // app.router.get('/test', 'test', controller.foo.getData);
  app.get('/foo', controller.foo.getData);
  app.post('/', controller.foo.getData);
}
