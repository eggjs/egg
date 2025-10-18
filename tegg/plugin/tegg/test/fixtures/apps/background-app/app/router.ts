import { Application } from 'egg';

export default (app: Application) => {
  app.router.get('/background', app.controller.app.background);
  app.router.get('/backgroudTimeout', app.controller.app.backgroudTimeout);
};
