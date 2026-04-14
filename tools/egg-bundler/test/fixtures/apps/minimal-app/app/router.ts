import type { Application } from 'egg';

export default (app: Application): void => {
  app.get('/', app.controller.home.index);
  app.get('/user/:id', app.controller.home.user);
};
