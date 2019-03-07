'use strict';

class DockerAdapter {
  constructor(app) {
    this.app = app;
  }

  async inspectDocker() {
    return 'docker';
  }

}

module.exports = DockerAdapter;
