'use strict';

const markdown = require('nunjucks-markdown');
const marked = require('marked');

module.exports = app => {
  markdown.register(app.nunjucks, marked);
};
