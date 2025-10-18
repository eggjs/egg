import { Application } from 'egg';

export default (app: Application) => {
  app.router.get('/apps', app.controller.app.find);
  app.router.post('/apps', app.controller.app.save);
};
