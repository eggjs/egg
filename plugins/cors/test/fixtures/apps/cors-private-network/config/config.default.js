exports.keys = 'cors-private-network-test';
exports.cors = { privateNetworkAccess: true };
exports.security = {
  csrf: false,
  domainWhiteList: ['.eggjs.org'],
};
