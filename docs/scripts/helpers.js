'use strict';

/* global hexo */

hexo.extend.helper.register('guide_toc', function() {
  const toc = this.site.data.guide_toc;
  let menu = '<dl>';

  for (const title in toc) {
    const subMenu = toc[title];
    menu += `<dt>${this.__('guide_toc.' + title)}</dt><dd><ul>`;
    for (const subTitle in subMenu) {
      const url = subMenu[subTitle];
      menu += `<li><a href="${url}">${this.__('guide_toc.' + subTitle)}</a></li>`;
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
    let link = menus[menu];
    const content = this.__(`menu.${menu}`);
    if (menu === 'guide' && this.page.lang !== 'en') {
      link = '/' + this.page.lang + link;
    }
    links += `<li><a href="${link}" alt="${content}">${content}</a></li>`;
  }

  return links;
});
