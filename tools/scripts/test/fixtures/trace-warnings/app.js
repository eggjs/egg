const EventEmitter = require('events');

module.exports = () => {
  console.log('app loaded');
  const event = new EventEmitter();
  event.setMaxListeners(1);

  // --trace-warnings test about MaxListenersExceededWarning
  event.on('xx', () => {});
  event.on('xx', () => {});

  // will not effect --no-deprecation argv
  new Buffer('aaa');
};
