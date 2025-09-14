'use strict';

import { Application } from 'egg';

export default (app: Application) => {
  console.log(`hi, egg, ${app.config.keys}`);
  console.log(`ts env: ${process.env.EGG_TYPESCRIPT}`);
};
