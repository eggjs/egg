import { Application } from 'egg';

export default (app: Application): void => {
  app.router.get('/background', app.controller.app.background);
  app.router.get('/backgroudTimeout', app.controller.app.backgroudTimeout);
};
