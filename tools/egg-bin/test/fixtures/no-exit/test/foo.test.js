'use strict';

const http = require('http');
const assert = require('assert');

describe('mocha-test', () => {
  it('should work', () => {
    assert(true);
  });
});

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('okay');
});
server.listen();
