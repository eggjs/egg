module.exports = (app) => {
  app.get("/", async function () {
    this.body = `hi, ${app.config.framework || "egg"}`;
  });
};
