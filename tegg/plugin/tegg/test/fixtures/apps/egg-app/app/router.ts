import type { Application } from 'egg';

export default (app: Application): void => {
  app.router.get('/apps', app.controller.app.find);
  app.router.get('/apps2', app.controller.app.find2);
  app.router.post('/apps', app.controller.app.save);
};
