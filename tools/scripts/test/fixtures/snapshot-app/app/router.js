module.exports = (app) => {
  app.get('/', async function () {
    this.body = {
      message: 'hello from snapshot app',
      pid: process.pid,
    };
  });
};
