'use strict';

process.on('message', function(msg) {
  if (msg.action === 'kill-agent') process.exit(1);
});
