'use strict';

module.exports = function* () {
  let args;
  if (this.query.host) {
    args = {};
    args.headers = { host: this.query.host };
  }
  if (this.query.Host) {
    args = {};
    args.headers = { Host: this.query.Host };
  }
  if (this.query.disableDNSCache) {
    args = { enableDNSCache: false };
  }
  const result = yield this.curl(this.query.url, args);
  this.status = result.status;
  this.set(result.headers);
  this.body = result.data;
};
