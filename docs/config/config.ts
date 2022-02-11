import { defineConfig } from 'dumi';

export default defineConfig({
  mode: 'site',
  title: 'Egg',

  description: 'Born to build better enterprise frameworks and apps',

  logo: '/logo.svg',
  favicon: '/favicon.png',

  algolia: {
    apiKey: '1561de31a86f79507ea00cdb54ce647c',
    indexName: 'eggjs',
  },

  exportStatic: {},

  sitemap: {
    hostname: 'https://eggjs.org',
  },

  navs: {
    'en-US': [
      null,
      {
        title: 'API',
        path: 'https://eggjs.org/api/index.html',
      },
      {
        title: 'GitHub',
        path: 'https://github.com/eggjs/egg',
      },
      {
        title: 'Release',
        path: 'https://github.com/eggjs/egg/releases',
      },
      {
        title: 'Plugins',
        path: 'https://github.com/search?q=topic%3Aegg-plugin&type=Repositories',
      },
    ],
    'zh-CN': [
      null,
      {
        title: 'API',
        path: 'https://eggjs.org/api/index.html',
      },
      {
        title: 'GitHub',
        path: 'https://github.com/eggjs/egg',
      },
      {
        title: '插件列表',
        path: 'https://github.com/search?q=topic%3Aegg-plugin&type=Repositories',
      },
      {
        title: '发布日志',
        path: 'https://github.com/eggjs/egg/releases',
      },
    ],
  },
});
