import type { Application } from 'egg';

export default (app: Application): void => {
  app.router.get('/apps', app.controller.app.find);
  app.router.post('/apps', app.controller.app.save);
};
