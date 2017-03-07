'use strict';

const url = require('url');
const markdownItTocAndAnchor = require('markdown-it-toc-and-anchor').default;
const markdownItReplaceLink = require('markdown-it-replace-link');

const md = require('markdown-it')({
  // replace .md to .html in markdown files
  replaceLink(link) {
    const urlObj = url.parse(link);
    if (urlObj.pathname && urlObj.pathname[0] === '.' && /\.md$/.test(urlObj.pathname)) {
      urlObj.pathname = urlObj.pathname.replace(/md$/, 'html');
      return url.format(urlObj);
    }
    return link;
  },
});
md.use(markdownItTocAndAnchor, {
  toc: true,
  anchorLink: true,
  anchorClassName: 'markdown-anchor',
});
md.use(markdownItReplaceLink);

module.exports = function(data) {
  const a = md.render(data.text);
  return a;
};
