'use strict';

module.exports = async function () {
  await this.render('home.html', {
    user: {
      name: 'fengmk2',
    },
  });
};
