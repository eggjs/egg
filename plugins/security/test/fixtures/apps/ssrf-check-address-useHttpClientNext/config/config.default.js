exports.security = {
  ssrf: {
    ipBlackList: ['10.0.0.0/8', '127.0.0.1', '0.0.0.0/32'],
    checkAddress(ip) {
      return ip !== '127.0.0.2';
    },
  },
};

exports.httpclient = {
  useHttpClientNext: true,
};
