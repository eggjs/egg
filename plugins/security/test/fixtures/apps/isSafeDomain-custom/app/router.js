module.exports = function (app) {
  const customWhiteList = ['*.foo.com', '*.bar.net'];

  app.get('/unsafe', async function () {
    const unsafeDomains = [
      // unsafe
      'aAa-domain.com',
      '192.1.168.0',
      'http://www.baidu.com/zh-CN',
      'www.alimama.com',
      'foo.com.cn',
      'a.foo.com.cn',

      // safe
      'pre-www.foo.com',
      'pre-www.bar.net',
    ];
    let unsafeCounter = 0;
    for (let unsafeDomain of unsafeDomains) {
      if (!this.isSafeDomain(unsafeDomain, customWhiteList)) {
        unsafeCounter++;
      }
    }

    this.body = unsafeCounter === 6 ? false : true;
  });

  app.get('/safe', async function () {
    const safeDomains = [
      'a.foo.com',
      'a.b.foo.com',
      'a.b.c.foo.com',
      'pre-www.foo.com',
      'test.pre-www.foo.com',
      'a.bar.net',
      'a.b.bar.net',
      'a.b.c.bar.net',
      'pre-www.bar.net',
      'test.pre-www.bar.net',
    ];
    let safeCounter = 0;

    for (const safeDomain of safeDomains) {
      if (this.isSafeDomain(safeDomain, customWhiteList)) {
        safeCounter++;
      }
    }

    this.body = safeCounter === 10;
  });
};
