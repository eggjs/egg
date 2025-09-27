module.exports = app => {
  app.get('/testcsp', async function () {
    this.body = this.nonce;
  });

  app.get('/testcsp/custom', async function () {
    this.securityOptions.csp = {
      policy: {
        'script-src': ["'self'"],
        'style-src': ["'unsafe-inline'"],
        'img-src': ["'self'"],
        'frame-ancestors': ["'self'"],
        'report-uri': 'http://pointman.domain.com/csp?app=csp',
      },
    };
    this.body = this.nonce;
  });

  app.get('/testcsp/disable', async function () {
    this.securityOptions.csp = {
      enable: false,
    };
    this.body = 'hello';
  });
};
