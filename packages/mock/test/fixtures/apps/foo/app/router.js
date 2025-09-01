module.exports = function(app) {
  app.get('/', async function() {
    this.body = {
      fooPlugin: app.fooPlugin,
    };
  });
};
