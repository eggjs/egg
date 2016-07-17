'use strict';

const Service = require('../../../../../../').Service;

class OK extends Service {
  constructor(ctx) {
    super(ctx);
  }

  * get() {
    return {
      ok: true,
    };
  }
}

module.exports = OK;
