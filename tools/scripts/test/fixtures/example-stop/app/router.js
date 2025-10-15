module.exports = (app) => {
  app.get("/", async function () {
    this.body = `hi, ${app.config.framework || "egg"}`;
  });

  app.get("/env", async function () {
    this.body = app.config.env + ", " + app.config.pre;
  });

  app.get("/path", async function () {
    this.body = process.env.PATH;
  });
};
