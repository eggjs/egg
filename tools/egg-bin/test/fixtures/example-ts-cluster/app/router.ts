'use strict';

import { Application } from 'egg';

export default (app: Application) => {
  app.router.get('/', app.controller.home.index);
};
