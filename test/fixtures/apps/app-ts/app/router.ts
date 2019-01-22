import { Application } from 'egg';

export default (app: Application) => {
  const controller = app.controller;
  app.get('/foo', app.middleware.test(), controller.foo.getData);
  app.post('/', controller.foo.getData);
}
