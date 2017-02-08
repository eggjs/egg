'use strict';

const renderer = require('../lib/renderer');


/* global hexo */

hexo.extend.renderer.register('md', 'html', renderer, true);

hexo.extend.helper.register('guide_toc', function() {
  const toc = this.site.data.guide_toc;
  let menu = '<dl>';

  for (let title in toc) {
    const subMenu = toc[title];
    title = getI18nText(this.__, title, 'guide_toc.');
    menu += `<dt>${title}</dt><dd><ul>`;
    for (let subTitle in subMenu) {
      const url = '/' + this.page.lang + subMenu[subTitle];
      subTitle = getI18nText(this.__, subTitle, 'guide_toc.');
      menu += `<li><a href="${url}">${subTitle}</a></li>`;
    }
    menu += '</ul></dd>';
  }

  menu += '</dl>';
  return menu;
});

hexo.extend.helper.register('menu_link', function() {
  const menus = this.site.data.menu;

  let links = '';
  for (const menu in menus) {
    console(x);
    let link = menus[menu];
    const content = getI18nText(this.__, menu, 'menu.');

    if (menu === 'guide' && this.page.lang !== 'en') {
      link = '/' + this.page.lang + link;
    }
    links += `<li><a href="${link}" alt="${content}">${content}</a></li>`;
  }

  return links;
});

hexo.extend.helper.register('index_link', function(url) {
  if (!url) {
    url = '/';
  }
  if (this.page.lang !== 'en') {
    return `/${this.page.lang}${url}`;
  }
  return url;
});

function getI18nText(gettext, text, prefix) {
  const key = prefix + text;
  const tmp = gettext(key);
  return tmp === key ? text : tmp;
}
