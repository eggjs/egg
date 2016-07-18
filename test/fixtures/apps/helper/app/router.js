module.exports = app => {
  app.get('home', '/home', 'home');

  app.get('/pathFor', function* () {
    this.body = this.helper.pathFor('home', this.query);
  });

  app.get('/urlFor', function* () {
    this.body = this.helper.urlFor('home', this.query);
  });

  app.get('/escape', function* () {
    this.body = this.helper.escape('<script>');
  });

  // should work
  app.get('/shtml', function* () {
    this.body = this.helper.shtml('<img src="http://shaoshuai.me" alt="alt">') == '<img src="http://shaoshuai.me" alt="alt">';
  });

  // should santilize tags not in whiteList
  app.get('/shtml-sanitise', function* () {
    this.body = this.helper.shtml('<a href="/">xx</a><h1>a</h1>') == '<a href="/">xx</a>&lt;h1&gt;a&lt;/h1&gt;';
  });

  app.get('/shtml-not-in-domain-whitelist', function* () {
    this.body = this.helper.shtml('<a href="http://xx.me">xx</a>') == '<a>xx</a>';
  });

  app.get('/shtml-in-default-domain-whitelist', function* () {
    this.body = this.helper.shtml('<a href="http://alipay.com/xx">xx</a>') == '<a href="http://alipay.com/xx">xx</a>';
  });
};
