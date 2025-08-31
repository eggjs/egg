'use strict';

module.exports = app => {
  app.get('/generator-function', 'generatorFunction');
  app.get('/object-function', 'object.callFunction');
  app.get('/class-function', 'class.asyncFunction');
};
