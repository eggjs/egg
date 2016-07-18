module.exports = app => {
  app.get('/', function*() {
    this.body = 'ok';
  });

  app.get('/getData', function*() {
    this.body = yield app.mockClient.getData();
  });

  app.get('/getError', function*() {
    try {
      yield app.mockClient.getError();
    } catch (err) {
      this.body = err.message;
    }
  });

  app.get('/getDataGenerator', function* () {
    this.body = yield app.mockClient.getDataGenerator();
  })

  app.get('/sub', function*() {
    this.body = app.foo;
  });
};
