import { Application } from 'egg';

export default (app: Application): void => {
  app.router.get('/invokeFoo', app.controller.app.invokeFoo);
};
