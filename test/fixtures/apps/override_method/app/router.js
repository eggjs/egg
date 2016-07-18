module.exports = app => {
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
