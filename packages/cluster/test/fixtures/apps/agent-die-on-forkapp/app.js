'use strict';

module.exports = function(app) {
  process.send({
    action: 'kill-agent',
  });
  setTimeout(app.readyCallback('kill-agent-callback'), 2000);
};
