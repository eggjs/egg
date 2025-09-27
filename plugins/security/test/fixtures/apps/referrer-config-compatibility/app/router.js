module.exports = function (app) {
  app.get('/', function () {
    this.body = '123';
  });
  app.get('/referrer', function () {
    const policy = this.query.policy;
    this.body = '123';
    this.securityOptions.refererPolicy = {
      enable: true,
      value: policy,
    };
  });
};
