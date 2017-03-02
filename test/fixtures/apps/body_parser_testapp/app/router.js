module.exports = app => {
  app.get('/test/body_parser/user', function* () {
    this.body = {
      url: this.url,
      csrf: this.csrf
    };
  });

  app.post('/test/body_parser/user', function* () {
    this.logger.info('request body %s', this.request.body);
    this.body = this.request.body;
  });

  app.post('/test/body_parser/foo.json', function* () {
    this.body = this.request.body;
  });
  app.post('/test/body_parser/form.json', function* () {
    this.body = this.request.body;
  });
};
