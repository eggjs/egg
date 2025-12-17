'use strict';

module.exports = async function() {
  let args;
  if (this.query.host) {
    args = {};
    args.headers = { host: this.query.host };
  }
  if (this.query.Host) {
    args = {};
    args.headers = { Host: this.query.Host };
  }
  if (this.query.disableDNSCache === 'true') {
    args = { enableDNSCache: false };
  }
  const result = await this.fetch(this.query.url, args);
  this.status = result.status;
  this.set(result.headers.raw());
  this.body = await result.text();
};
