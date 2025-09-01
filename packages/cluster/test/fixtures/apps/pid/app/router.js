module.exports = app => {
  app.get('/exit', async () => {
    process.exit(1);
  });
};
