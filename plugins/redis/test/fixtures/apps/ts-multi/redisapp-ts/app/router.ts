import { Application } from 'egg';

export default (app: Application) => {
  const controller = app.controller;
  app.logger.info('debug');
  app.get('/', controller.home.index);
};
