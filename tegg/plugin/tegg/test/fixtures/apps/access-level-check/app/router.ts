import { Application } from 'egg';

export default (app: Application) => {
  app.router.get('/invokeFoo', app.controller.app.invokeFoo);
};
