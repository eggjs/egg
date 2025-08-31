const HttpClient = require('urllib').HttpClient;
const urllib = new HttpClient();

exports.urllib = {
  keepAlive: false,
  foo: null,
  bar: undefined,
  n: 1,
  dd: new Date(),
  httpclient: urllib,
};

exports.buffer = Buffer.from('1234');
exports.array = [];

exports.console = console;

exports.zero = 0;
exports.number = 1;
exports.ok = true;
exports.f = false;
exports.no = null;
exports.empty = {};
exports.date = new Date();
exports.ooooo = urllib;
