const Client = require('./client');

module.exports = function (app) {
  const done = app.readyCallback('agent:app');
  setTimeout(() => {
    done();
  }, 100);

  app.client = app.cluster(Client).create();
};
