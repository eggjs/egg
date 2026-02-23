import { Application } from 'egg';

export default (app: Application) => {
  app.router.get('/', app.controller.home.index);
  app.router.get('/foo', app.controller.home.foo);
};
