exports.keys = 'cors-test';
exports.cors = { credentials: true };
exports.security = {
  domainWhiteList: ['.eggjs.org', 'https://b.com:1234'],
};
