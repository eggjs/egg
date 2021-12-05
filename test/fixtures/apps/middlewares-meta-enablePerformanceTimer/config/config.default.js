'use strict';

const fs = require('fs');
const path = require('path');

exports.security = {
  csrf: false,
};

exports.keys = 'foo';

exports.logger = {
  enablePerformanceTimer: true,
};
