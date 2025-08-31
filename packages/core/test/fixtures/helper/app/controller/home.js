module.exports = async function () {
  try {
    this.body = `
      app: ${this.helper.exists(this.helper.app)}
      plugin a: ${this.helper.exists(this.helper.a)}
      plugin b: ${this.helper.exists(this.helper.b)}
      override: ${this.helper.override()}
      not exists on locals: ${this.helper.exists(this.notExistsApp)}
    `;
  } catch (e) {
    console.log(e);
  }
};
