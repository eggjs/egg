'use strict';

exports.index = function* () {
  const r = yield this.curl(this.query.url, {
    dataType: 'json',
  });
  this.body = {
    url: this.query.url,
    data: r.data,
  };
};
