'use strict';

module.exports = app => {
  app.get('/hello', 'home.index');
};
