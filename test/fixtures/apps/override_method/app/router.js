module.exports = app => {
  app.get('/test', function* () {
    this.body = "test-get";
  });

  app.put('/test', function* () {
    this.body = "test-put";
  });

  app.delete('/test', function* () {
    this.body = 'test-delete';
  });

  app.patch('/test', function* () {
    this.body = 'test-patch';
  });
};
