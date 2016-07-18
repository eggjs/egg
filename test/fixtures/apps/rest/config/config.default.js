
exports.security = {
  csrf: {
    ignore: '/api/',
  },
  ctoken: {
    ignore: '/api/',
  }
};

exports.bodyParser = {
  strict: false
}
