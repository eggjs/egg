'use strict';

exports.keys = 'test key';

exports.security = {
  /**
   * disable methodnoallow
   */
  methodnoallow: {
    enable: false,
  },

  csrf: {
    type: 'referer',
    refererWhiteList: [],
  },
};
