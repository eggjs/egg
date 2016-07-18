// /categories
exports.index = function* () {
  this.data = [
    {
      name: 'c1',
    },
    {
      name: 'c2'
    }
  ];
};

exports.show = function* () {
  this.data = {
    id: this.params.id,
    ids: this.params.ids
  };
};
