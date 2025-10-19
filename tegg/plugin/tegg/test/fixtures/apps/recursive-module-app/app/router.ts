import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.get('/apps', app.controller.app.find);
  app.router.post('/apps', app.controller.app.save);
};
