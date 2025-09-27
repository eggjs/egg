module.exports = app => {
  app.get('/escape', async function () {
    this.body = this.helper.escape('&\"\'<>_-aA') === '&amp;&quot;&#39;&lt;&gt;_-aA';
  });

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

  app.get('/shtml-escape-img-onload', async function () {
    this.body =
      this.helper.shtml('<h1>Hello</h1><img onload="alert(1);" src="http://domain.com/1.png" title="this is image">') ==
      '<h1>Hello</h1><img src="http://domain.com/1.png" title="this is image">';
  });

  app.get('/shtml-escape-hostname-null', async function () {
    this.body = this.helper.shtml('<a href="javascript:;">test</a>') == '<a href>test</a>';
  });

  app.get('/shtml-ignore-domains-not-in-default-domainList', async function () {
    this.body =
      this.helper.shtml('<img src="http://shaoshuai.me" alt="alt"><a href="http://shaoshuai.me">xx</a>') ==
      '<img alt="alt"><a>xx</a>';
  });

  app.get('/shtml-absolute-path', async function () {
    this.body =
      this.helper.shtml('<img src="/xx.png" alt="alt"><a href="/xx.png">xx</a>') ==
      '<img src="/xx.png" alt="alt"><a href="/xx.png">xx</a>';
  });

  app.get('/shtml-custom-via-security-options', async function () {
    this.securityOptions.shtml = {
      whiteList: {
        video: ['src'],
      },
    };
    this.body =
      this.helper.shtml('<div src="xx"></div><video src="/xxx" style="xxx"></video>') ===
      '&lt;div src="xx"&gt;&lt;/div&gt;<video src="/xxx"></video>';
  });

  app.get('/sjs', async function () {
    const foo = '"hello"';
    this.body =
      `var foo = "${foo}"; var foo = "${this.helper.sjs(foo)}";` ===
      'var foo = ""hello""; var foo = "\\x22hello\\x22";';
  });

  app.get('/sjs-2', async function () {
    const foo = '"hello\'\\()<>.';
    this.body = `${this.helper.sjs(foo)}` === '\\x22hello\\x27\\x5c\\x28\\x29\\x3c\\x3e\\x2e';
  });
};
