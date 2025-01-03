module.exports = app => {
  app.get('/agent-throw', async function() {
    app.messenger.broadcast('agent-throw');
    this.body = 'done';
  });

  app.get('/agent-throw-async', async function() {
    app.messenger.broadcast('agent-throw-async');
    this.body = 'done';
  });

  app.get('/agent-throw-string', async function() {
    app.messenger.broadcast('agent-throw-string');
    this.body = 'done';
  });
};
