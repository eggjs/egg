module.exports = app => {
  app.get('/escapeShellCmd', async function () {
    const port = '8889|chmod 777 /tmp/muma.sh;';
    this.body =
      `cp.exec('./start.sh '+${this.helper.escapeShellCmd(port)})` ===
      "cp.exec('./start.sh '+8889chmod 777 /tmp/muma.sh)";
  });

  app.get('/escapeShellCmd-2', async function () {
    const port = '-Pn -A -sT 8889';
    this.body = `${this.helper.escapeShellCmd(port)}` === '-Pn -A -sT 8889';
  });
};
