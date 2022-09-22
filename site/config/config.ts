import { defineConfig } from 'dumi';

export default defineConfig({
  mode: 'site',
  title: 'Egg',

  description: 'Born to build better enterprise frameworks and apps',

  logo: '/logo.svg',
  favicon: '/favicon.png',

  // algolia: {
  //   apiKey: '1561de31a86f79507ea00cdb54ce647c',
  //   indexName: 'eggjs',
  // },

  theme: {
    '@c-primary': '#22ab28',
  },

  exportStatic: {},

  sitemap: {
    hostname: 'https://eggjs.org',
  },

  navs: {
    'en-US': [
      null,
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

  themeConfig: {
    links: [
      {
        title: 'Resources',
        list: [
          {
            name: 'Egg',
            url: 'https://github.com/eggjs/egg',
          },
          {
            name: 'Organization',
            url: 'https://github.com/eggjs',
          },
        ],
      },
      {
        title: 'XTech',
        list: [
          { name: 'EggJS - 企业级 Node.js 开发框架', url: 'https://eggjs.org' },
          { name: 'Ant Design - UI 体系', url: 'https://ant.design' },
          { name: 'AntV - 数据可视化', url: 'https://antv.vision' },
          {
            name: '语雀 - 知识创作与分享工具',
            url: 'https://www.yuque.com',
          },
        ],
      },
      {
        title: 'Community',
        list: [
          { name: 'CNode 社区', url: 'https://cnodejs.org/' },
          { name: 'Node.js 专栏', url: 'https://www.yuque.com/egg/nodejs' },
          {
            name: '提交反馈',
            url: 'https://github.com/eggjs/egg/issues',
          },
          { name: '发布日志', url: 'https://github.com/eggjs/egg/releases' },
        ],
      },
      {
        title: 'Egg.js Dingtalk',
        list: [
          {
            name: '钉钉',
            qrcode: '/img_egg/qrcode_dingtalk.png',
          },
        ],
      },
    ],
  },
});
