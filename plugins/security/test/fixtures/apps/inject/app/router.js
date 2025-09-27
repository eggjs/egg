const mockHtml = `
  <html>
  <head>
      <title></title>
  </head>
  <body>

  </body>
  </html>
`;

module.exports = app => {
  app.get('/testcsrf', async function () {
    let bodyString = '<form></form>';
    this.body = app.injectCsrf(bodyString);
  });
  app.get('/testcsrf2', async function () {
    let bodyString2 = '<form><input type="hidden" name="_csrf" value="{{ctx.csrf}}"></form>';
    this.body = app.injectCsrf(bodyString2);
  });
  app.get('/testcsrf3', async function () {
    let bodyString9 = '<form><input type="hidden" name=\'_csrf\' value="{{ctx.csrf}}"></form>';
    this.body = app.injectCsrf(bodyString9);
  });
  app.get('/testnonce', async function () {
    let bodyString3 =
      '<script></script><script></script><script></script ><script></script                    ><script></script        \t\n    \r\n         ><script></script\t\n bar>';
    this.body = await this.renderString(this.nonce + '|' + app.injectNonce(bodyString3), this);
  });
  app.get('/testnonce2', async function () {
    let bodyString4 = '<script nonce="{{ctx.nonce}}"></script><script nonce="{{ctx.nonce}}"></script>';
    this.body = app.injectNonce(bodyString4);
  });
  app.get('/testrender', async function () {
    this.set('x-csrf', this.csrf);
    await this.render('index.nj', {});
  });
  app.get('/testispInjection', async function () {
    const injectDefenceHtml = app.injectHijackingDefense(mockHtml);

    function mockInject(html) {
      const injectScript = '<script>document.write("haha250")</script>';
      const regHackByStart = /([\S\s]*?)<\/html>/;
      return html.replace(regHackByStart, function ($0, $1) {
        return $1 + injectScript + '</html>';
      });
    }
    // console.log(mockInject(mockHtml));
    this.body = await this.renderString(mockInject(injectDefenceHtml), this);
  });
};
