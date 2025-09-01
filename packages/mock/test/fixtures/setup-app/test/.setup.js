const mm = require('../../../../index');
const path = require('path');
before(async () => {
  global.app = mm.app({
    baseDir: path.join(__dirname, '../'),
    framework: require.resolve('egg'),
  });
  mm.setGetAppCallback(() => {
    return global.app;
  });
  await global.app.ready();
});
