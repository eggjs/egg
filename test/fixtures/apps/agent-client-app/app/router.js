'use strict';

module.exports = function(app) {
  const done = app.readyCallback('app_subscribe_data');
  app.subClient.subscribe('mock-data', val => {
    app.mockData = val;
    done();
  });

  const done1 = app.readyCallback('app_subscribe_not_exist_data');
  app.subClient.subscribe('not-exist-data', val => {
    app.notExistData = val;
    done1();
  });

  app.get('/', function*() {
    const val = yield cb => app.subClient.subscribe('mock-data', val => {
      cb(null, val);
    });

    this.body = {
      'mock-data': val,
      'app-mock-data': app.mockData,
    };
  });

  app.get('/not-exist', function*() {
    const val = yield cb => app.subClient.subscribe('not-exist-data', val => {
      cb(null, val);
    });

    this.body = {
      'not-exist-data': null,
      'app-not-exist-data': null,
    };
  });
};
