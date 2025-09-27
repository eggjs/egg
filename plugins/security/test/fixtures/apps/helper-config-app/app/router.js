module.exports = function (app) {
  app.get('/shtml-configuration', async function () {
    this.body =
      this.helper.shtml(
        '<h1>Hello</h1><img onload="alert(1);" src="http://xx.com/1.png" title="this is image"><a title="xx">aa</a>'
      ) == '&lt;h1&gt;Hello&lt;/h1&gt;<img><a title="xx">aa</a>';
  });

  app.get('/shtml-extending-domainList-via-config.helper.shtml.domainWhiteList', async function () {
    this.body =
      this.helper.shtml('<img src="http://xx.shaoshuai.me" alt="alt"><a href="http://xx.shaoshuai.me">xx</a>') ==
      '<img src="http://xx.shaoshuai.me"><a>xx</a>';
  });

  app.get('/shtml-stripe-css-url', async function () {
    this.body =
      this.helper.shtml('<h2 style="color: red; background: url(javascript:);">xx</h2>') == '<h2 style>xx</h2>';
  });
};
