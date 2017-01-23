module.exports = app => {
  app.get('home', '/', 'home');
  app.get('/hello', app.controller.hello);
  app.get('/logger', app.controller.logger);
  app.get('/protocol', function*() {
    this.body = this.protocol;
  });

  app.get('/user.json', app.jsonp(), function*() {
    this.body = { name: 'fengmk2' };
  });
  app.get('/ip', app.controller.ip);
};
