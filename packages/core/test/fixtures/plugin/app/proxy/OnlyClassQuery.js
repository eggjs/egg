'use strict';

const Proxy = require('../../../egg/proxy');

class OnlyCLassQuery extends Proxy {
  constructor(ctx) {
    super(ctx);
  }

  *query() {
    return {
      foo: 'clz',
    };
  }
}

module.exports = OnlyCLassQuery;
