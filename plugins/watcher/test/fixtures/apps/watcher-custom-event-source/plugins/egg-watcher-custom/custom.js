const { Base } = require('sdk-base');

class CustomEventSource extends Base {
  constructor(options) {
    super();
    this._options = options;
    this.ready(true);
  }

  watch(path) {
    this.emit('info', 'info12345');
    this.emit('warn', 'warn12345');
    this._h = setInterval(() => {
      this.emit('change', {
        path,
        foo: this._options.foo,
      });
    }, 1000);
  }

  unwatch() {
    if (this._h) {
      clearInterval(this._h);
    }
  }
}

module.exports = CustomEventSource;
