/**!
 * loading - test/fixtures/services/foo.js
 *
 * Copyright(c) fengmk2 and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <fengmk2@gmail.com> (http://fengmk2.github.com)
 */

'use strict';

/**
 * Module dependencies.
 */

exports.get = function (callback) {
  setTimeout(function () {
    callback(null, 'overwrite bar');
  }, 1);
};
