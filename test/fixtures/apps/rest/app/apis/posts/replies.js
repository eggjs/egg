exports.index = function* () {
  aaa;
};

exports.show = function* () {
  this.data = {
    pid: this.params.parent_id,
    id: this.params.id,
    text: 'foo text'
  };
};
