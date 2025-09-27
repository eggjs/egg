'use strict';

exports.keys = 'test key';

exports.security = {
  defaultMiddleware: 'xframe',
  domainWhiteList: ['.domain.com', 'http://www.baidu.com', '192.*.0.*', '*.alibaba.com'],
};
