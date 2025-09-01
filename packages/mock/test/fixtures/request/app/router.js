module.exports = app => {
  app.get('home', '/', async function() {
    this.body = 'hello world';
  });

  app.get('session', '/session', async function() {
    this.body = 'hello session';
  });
};
