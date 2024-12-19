'use strict';

exports.index = async function () {
  const r = await this.curl(this.query.url, {
    dataType: 'json',
  });
  this.body = {
    url: this.query.url,
    data: r.data,
  };
};
