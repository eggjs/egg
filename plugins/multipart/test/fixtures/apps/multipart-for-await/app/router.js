'use strict';

module.exports = app => {
  app.post('/upload', app.controller.upload.index);
};
