module.exports = app => {
  app.get('/404', function*() {
    this.body = 'Hi, this is 404';
  });
};
