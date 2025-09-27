module.exports = function (app) {
  app.get('/', async function () {
    const unsafeDomains = ['aAa-domain.com', '192.1.168.0', 'http://www.baidu.com/zh-CN', 'www.alimama.com'];
    let unsafeCounter = 0;
    for (let unsafeDomain of unsafeDomains) {
      if (!this.isSafeDomain(unsafeDomain)) {
        unsafeCounter++;
      }
    }
    this.body = unsafeCounter === 4 ? false : true;
  });
  app.get('/safe', async function () {
    const safeDomains = ['wWw.domain.com', '192.1.0.255', 'http://www.BaIDu.com', 'wwW.alIbAbA.com'];
    let safeCounter = 0;
    for (let safeDomain of safeDomains) {
      if (this.isSafeDomain(safeDomain)) {
        safeCounter++;
      }
    }
    this.body = safeCounter === 4;
  });
};
