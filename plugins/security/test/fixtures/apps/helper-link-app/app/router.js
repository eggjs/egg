module.exports = function (app) {
  app.get('/shtml-ignore-hash', async function () {
    this.body = this.helper.shtml('<a href="#abc">xx</a>') == '<a href="#abc">xx</a>';
  });

  app.get('/shtml-not-in-whitelist', async function () {
    this.body = this.helper.shtml('<a href="http://www.baidu.com#abc">xx</a>') == '<a href="">xx</a>';
  });
};
