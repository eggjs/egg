'use strict';

module.exports = function() {
  const server = require('http').createServer(function(req, res) {
    res.write('ok');
    res.end();
  });
  server.listen(7002);
};
