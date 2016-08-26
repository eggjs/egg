'use strict';

module.exports = function* () {
  yield this.render('home.html', {
    user: {
      name: 'foobar',
    },
    title: 'egg view example',
  });
};
