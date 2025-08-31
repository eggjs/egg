'use strict';

module.exports = app => {
  setTimeout(app.readyCallback('a'), 100);
  setTimeout(app.readyCallback('b'), 500);
};
