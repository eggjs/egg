module.exports = app => {
  app.get('/cliFilter', async function () {
    const port = '8889|chmod 777 /tmp/muma.sh;';
    this.body =
      `cp.exec('./start.sh '+${this.helper.cliFilter(port)})` === "cp.exec('./start.sh '+8889chmod777tmpmuma.sh)";
  });

  app.get('/cliFilter-2', async function () {
    const port = '8889';
    this.body = `${this.helper.cliFilter(port)}` === '8889';
  });
};
