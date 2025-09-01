'use strict';

const fs = require('fs');
const path = require('path');
const Client = require('./client');

module.exports = function(app) {
  const done = app.readyCallback('agent:app');
  const p = path.join(__dirname, 'run/test.txt');
  setTimeout(() => {
    fs.readFile(p, 'utf-8', done);
  }, 1000);

  app.client = app.cluster(Client).create();
};
