'use strict';

exports.index = function *() {
  this.locals = {b: 'b'};
  yield this.render('index.html', {
    a: '111',
  });
};

exports.string = function *() {
  this.locals = {b: 'b'};
  this.body = yield this.renderString('{{a}}', {
    a: '111',
  });
};

exports.sameView = function* () {
  this.body = {
    same: this.view === this.view,
  };
};
