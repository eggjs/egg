import { Application } from 'egg';

export default (app: Application) => {
  app.get('/foo', app.controller.foo.index);
}
