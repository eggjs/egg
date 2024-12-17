module.exports = app => {
  app.get('/', async function() {
    this.body = 'Hi, this is home';
  });
};
