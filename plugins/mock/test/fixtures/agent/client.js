const { Base } = require('sdk-base');

class Client extends Base {
  constructor() {
    super();
    this.ready(true);
  }

  subscribe(topic, listener) {
    setTimeout(() => listener(topic), 10);
  }
}

module.exports = Client;
