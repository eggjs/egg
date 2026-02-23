import { Application } from 'egg';

module.exports = (app: Application) => {
  app.router.all('/stream', app.controller.app.allStream);
  app.router.get('/init', app.controller.app.init);
  app.router.post('/message', app.controller.app.message);
};
