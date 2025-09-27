module.exports = function (app) {
  app.get('/shtml-basic', async function () {
    this.body =
      this.helper.shtml('<img src="https://domain.com"><h1>xx</h1>') == '<img src="https://domain.com"><h1>xx</h1>';
  });

  app.get('/shtml-escape-tag-not-in-default-whitelist', async function () {
    this.body = this.helper.shtml('<html><h1>Hello</h1></html>') == '&lt;html&gt;<h1>Hello</h1>&lt;/html&gt;';
  });

  app.get('/shtml-multiple-filter', async function () {
    this.body =
      this.helper.shtml(this.helper.shtml('<html><h1>Hello</h1></html>')) == '&lt;html&gt;<h1>Hello</h1>&lt;/html&gt;';
  });

  app.get('/shtml-escape-script', async function () {
    this.body =
      this.helper.shtml('<h1>Hello</h1><script>alert(1)</script>') ==
      '<h1>Hello</h1>&lt;script&gt;alert(1)&lt;/script&gt;';
  });
};
