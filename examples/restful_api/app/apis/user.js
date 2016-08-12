'use strict';

const users = [
  {
    name: 'fengmk2',
    url: 'https://fengmk2.com',
    projects: [
      'urllib',
      'egg',
    ],
    createdAt: new Date(),
    modifiedAt: new Date(),
  },
  {
    name: 'dead-horse',
    url: 'http://deadhorse.me',
    projects: [
      'koa',
      'egg',
    ],
    createdAt: new Date(),
    modifiedAt: new Date(),
  },
];

// GET /api/users
exports.index = function* () {
  this.meta = {
    total: Object.keys(users).length,
  };
  this.data = users;
};

// GET /api/users/:id
exports.show = function* () {
  const user = users.find(user => user.name === this.params.id);
  this.data = user;
};

// POST /api/users
exports.create = function* () {
  const user = this.params.data;
  if (!user.name) {
    this.throw(400, 'missing name field');
  }
  if (users.find(user => user.name === this.params.id)) {
    this.throw(400, `${user.name} exists`);
  }

  user.modifiedAt = user.createdAt = new Date();
  users.push(user);
  this.data = this.params.data;
};

// PUT /api/users/:id
exports.update = function* () {
  const user = this.params.data;
  if (!user.name) {
    this.throw(400, 'missing name field');
  }
  const existsUser = users.find(user => user.name === this.params.id);
  if (!existsUser) {
    this.throw(400, `${user.name} not exists`);
  }

  Object.assign(existsUser, user);
  existsUser.modifiedAt = new Date();
  this.data = existsUser;
};

// DELETE /api/users/:id
exports.delete = function* () {
  const name = this.params.id;
  const index = users.findIndex(user => user.name === name);
  if (index === -1) {
    this.throw(400, `${name} not exists`);
  }

  users.splice(index, 1);
};
