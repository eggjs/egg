module.exports = app => {
  app.get('/', function*() {
    this.body = 'Hi, this is home';
  });
};
