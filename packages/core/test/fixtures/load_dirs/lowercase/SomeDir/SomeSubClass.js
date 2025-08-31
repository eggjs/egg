exports.getByName = function (name, callback) {
  setTimeout(function () {
    callback(null, { name: name });
  }, 1);
};
