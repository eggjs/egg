module.exports = app => {
  app.get('/default', app.jsonp(), 'jsonp.index');
  app.get('/empty', app.jsonp(), 'jsonp.empty');
  app.get('/disable', 'jsonp.index');
  app.get('/fn', app.jsonp({ callback: 'fn' }), 'jsonp.index');
  app.get('/referrer/subdomain', app.jsonp({ whiteList: '.test.com' }), 'jsonp.index');
  app.get('/referrer/equal', app.jsonp({ whiteList: 'test.com' }), 'jsonp.index');
  app.get(
    '/referrer/regexp',
    app.jsonp({ whiteList: [/https?:\/\/test\.com\//, /https?:\/\/foo\.com\//] }),
    'jsonp.index'
  );
  app.get('/csrf', app.jsonp({ csrf: true }), 'jsonp.index');
  app.get('/both', app.jsonp({ csrf: true, whiteList: 'test.com' }), 'jsonp.index');
  app.get('/mark', app.jsonp(), 'jsonp.mark');
  app.get(
    '/error',
    async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        ctx.createJsonpBody({ msg: error.message });
      }
    },
    app.jsonp(),
    'jsonp.error'
  );
};
