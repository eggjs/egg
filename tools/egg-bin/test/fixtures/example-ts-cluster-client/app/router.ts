import { Application } from 'egg';

export default (app: Application) => {
  app.router.get('/', app.controller.home.index);
  app.router.post('/publish', app.controller.home.publish);
  app.router.get('/getHosts', app.controller.home.getHosts);
};
