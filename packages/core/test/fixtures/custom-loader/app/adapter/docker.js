class DockerAdapter {
  constructor(app) {
    this.app = app;
  }

  async inspectDocker() {
    return this.app.config.customLoader.adapter;
  }
}

module.exports = DockerAdapter;
