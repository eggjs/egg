const markdown = require('nunjucks-markdown');
const { marked } = require('marked');

// module.exports = app => {
//   markdown.register(app.nunjucks, marked);
// };

module.exports = class AppBoot {
  constructor(app) {
    this.app = app;
  }

  async didLoad() {
    markdown.register(this.app.nunjucks, marked);
  }
};
