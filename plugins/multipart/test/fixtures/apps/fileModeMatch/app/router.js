'use strict';

module.exports = app => {
  app.post('/upload', app.controller.upload);
  app.post('/upload_file', app.controller.upload);
  app.post('/save', app.controller.save);
};
