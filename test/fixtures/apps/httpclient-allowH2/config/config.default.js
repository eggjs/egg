exports.httpclient = {
  allowH2: true,
  request: {
    timeout: 99,
  },
  connect: {
    rejectUnauthorized: false,
  },
};
