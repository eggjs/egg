'use strict';

module.exports = function(app) {
  // GET / 302 to /portal/i.htm
  app.redirect('/', '/portal/i.htm', 302);

  // GET /portal/i.htm => controllers/home.js
  app.get('/portal/i.htm', app.controller.home.index);
};
