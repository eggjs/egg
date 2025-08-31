exports.test = function(name) {
  return 'test-' + name + '@' + this.app.config.baseDir;
};

exports.test_safe = function(name) {
  return this.safe('<div>' + name + '</div>');
};