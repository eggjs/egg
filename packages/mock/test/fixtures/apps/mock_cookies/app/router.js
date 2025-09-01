module.exports = function(app) {
  app.get('/', async function() {
    this.body = {
      cookieValue: this.cookies.get('foo', { signed: false }) || undefined,
      cookiesValue: this.cookies.get('foo', { signed: false }) || undefined,
    };
  });
};
