import { Application } from 'egg';

export default (app: Application) => {
  const controller = app.controller;
  app.router.get('/test', app.middleware.test(), controller.foo.getData);
  app.get('/foo', controller.foo.getData);
  app.post('/', controller.foo.getData);
}
