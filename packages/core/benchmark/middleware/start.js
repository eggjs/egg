'use strict';

const EggApplication = require('../../test/fixtures/egg').Application;

const app = new EggApplication({
  baseDir: __dirname,
  type: 'application',
});

app.loader
  .loadAll()
  .then(() => {
    app.listen(7001);
    console.log('server started at 7001');
  })
  .catch(err => {
    throw err;
  });
