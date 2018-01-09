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

  app.get('/class-controller', 'foo.bar');

  app.get('/obj-controller', 'obj.bar');
  app.get('/obj-error', 'obj.error');
  app.get('/subobj-controller', 'obj.subObj.hello');

  app.get('/obj2-controller', app.controller.obj2.bar);
  app.get('/subobj2-controller', app.controller.obj2.subObj.hello);
  app.get('/subSubObj-hello', app.controller.obj2.subObj.subSubObj.hello);
};
