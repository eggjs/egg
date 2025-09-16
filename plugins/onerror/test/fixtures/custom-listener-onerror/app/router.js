module.exports = app => {
  app.get('/', async ctx => {
    const err = new Error('mock error');
    err.name = ctx.query.name || 'Error';
    throw err;
  });
};
