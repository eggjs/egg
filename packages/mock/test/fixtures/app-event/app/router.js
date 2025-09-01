module.exports = function(app) {
  app.get('/event', async function() {
    this.app.emit('eventByRequest');
    this.body = 'done';
  });
};
