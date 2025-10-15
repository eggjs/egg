module.exports = (app) => {
  app.get("/", async function () {
    this.body = `hi, ${process.env.PATH}`;
  });
};
