'use strict';

module.exports = () => {
  process.on('message', msg => {
    if (msg.action === 'kill-agent') process.exit(1);
  });
};
