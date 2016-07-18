exports.index = function* (next) {
  if (this.query.empty) {
    return;
  }
  this.data = [
    {
      id: 1,
      name: 'fengmk2',
      age: 18
    },
    {
      id: 2,
      name: 'name2',
      age:30
    }
  ];
};

exports.show = function* () {
  if (this.params.id === '404') {
    return;
  }

  if (this.params.ids.length > 1) {
    if (this.query.id_only) {
      return this.data = this.params.ids;
    }

    var users = [];
    this.params.ids.forEach(function (id) {
      users.push({
        id: id,
        name: 'user_' + id
      });
    });

    this.meta = {
      count: 100
    };
    return this.data = users;
  }

  var user = {
    id: Number(this.params.id),
    name: 'fengmk2',
    age: 18
  };

  if (this.query.body_only) {
    return this.body = user;
  }

  this.data = user;
};

exports.createRule = {
  name: 'email',
  age: 'number',
};

exports.create = function* () {
  var user = this.params.data;
  if (user && user.name === 'empty@gmail.com') {
    return;
  }

  if (this.query.id_only) {
    return this.data = 3;
  }

  this.data = {
    id: 3,
    name: user.name,
    age: user.age
  };
};

exports.updateRule = {
  age: 'number'
};

exports.update = function* () {
  if (this.params.id === '3') {
    this.data = {
      id: 3,
      name: 'newuser1',
      age: 3
    };
  }
};

exports.destroy = function* () {
  this.set('ids', this.params.ids.join('&'));
};
