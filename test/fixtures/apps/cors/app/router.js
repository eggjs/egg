module.exports = app => {
  app.get('/', function*() {
    this.body = {
      foo: 'bar'
    };
  });

  app.post('/', function*() {
    this.body = {
      foo: 'bar'
    };
  });
};
