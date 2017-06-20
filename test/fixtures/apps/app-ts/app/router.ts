import { Application } from 'egg';

export default (app: Application) => {
  const controller = app.controller;
  app.get('/foo', controller.foo.getData);
  app.post('/', controller.foo.getData);
}
