import fs from 'node:fs';
import path from 'node:path';

import { defineConfig, type DefaultTheme } from 'vitepress';
import llmstxt, { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms';

import { version } from '../../package.json';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Egg.js',
  description: 'Born to build better enterprise frameworks and apps',

  head: [
    ['link', { rel: 'icon', href: '/favicon.png' }],
    [
      'meta',
      {
        name: 'description',
        content: 'Born to build better enterprise frameworks and apps',
      },
    ],
    ['meta', { name: 'keywords', content: 'Egg.js, Node.js, Koa, web framework' }],
    ['meta', { name: 'author', content: 'Egg.js' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
  ],

  // Use docs as the root directory for content
  srcDir: 'docs',

  // Clean URLs without .html extension
  cleanUrls: true,

  // Sitemap configuration
  sitemap: {
    hostname: 'https://eggjs.org',
  },

  // Ignore localhost links in dead link checking
  ignoreDeadLinks: 'localhostLinks',

  // i18n configuration
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: nav(),
        sidebar: {
          '/intro/': { base: '/intro/', items: sidebarIntro() },
          '/basics/': { base: '/basics/', items: sidebarBasics() },
          '/advanced/': { base: '/advanced/', items: sidebarAdvanced() },
          '/core/': { base: '/core/', items: sidebarCore() },
          '/tutorials/': { base: '/tutorials/', items: sidebarTutorials() },
          '/community/': { base: '/community/', items: sidebarCommunity() },
          '/faq/': { base: '/faq/', items: sidebarFaq() },
        },
      },
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-CN/',
      themeConfig: {
        nav: navZhCN(),
        sidebar: {
          '/zh-CN/intro/': { base: '/zh-CN/intro/', items: sidebarIntroZhCN() },
          '/zh-CN/basics/': {
            base: '/zh-CN/basics/',
            items: sidebarBasicsZhCN(),
          },
          '/zh-CN/advanced/': {
            base: '/zh-CN/advanced/',
            items: sidebarAdvancedZhCN(),
          },
          '/zh-CN/core/': { base: '/zh-CN/core/', items: sidebarCoreZhCN() },
          '/zh-CN/tutorials/': {
            base: '/zh-CN/tutorials/',
            items: sidebarTutorialsZhCN(),
          },
          '/zh-CN/community/': {
            base: '/zh-CN/community/',
            items: sidebarCommunityZhCN(),
          },
          '/zh-CN/faq/': { base: '/zh-CN/faq/', items: sidebarFaq() },
        },
      },
    },
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    socialLinks: [{ icon: 'github', link: 'https://github.com/eggjs/egg' }],

    footer: {
      message: 'Born to build better enterprise frameworks and apps',
      copyright: 'Copyright © 2017-present Egg.js',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/eggjs/egg/edit/next/site/docs/:path',
      text: 'Edit this page',
    },

    outline: {
      level: [2, 3],
    },
  },

  lastUpdated: true,

  // Custom CSS for theme color
  vite: {
    plugins: [llmstxt()],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `$primary-color: #22ab28;`,
        },
      },
    },
  },

  markdown: {
    lineNumbers: false,
    config(md) {
      md.use(copyOrDownloadAsMarkdownButtons);
    },
  },
});

// English navigation
function nav(): DefaultTheme.NavItem[] {
  return [
    { text: 'Intro', link: '/intro/quickstart', activeMatch: '/intro/' },
    { text: 'Basics', link: '/basics/structure', activeMatch: '/basics/' },
    { text: 'Advanced', link: '/advanced/', activeMatch: '/advanced/' },
    { text: 'Core', link: '/core/', activeMatch: '/core/' },
    { text: 'Tutorials', link: '/tutorials/', activeMatch: '/tutorials/' },
    {
      text: 'Community',
      activeMatch: '/community/',
      items: [
        { text: 'Community', link: '/community/' },
        {
          text: 'Contributing',
          link: 'https://github.com/eggjs/egg/blob/next/CONTRIBUTING.md',
        },
        { text: 'Frequently Asked Questions', link: '/community/faq' },
        { text: 'Common Errors', link: '/faq/' },
        { text: 'CNode Community', link: 'https://cnodejs.org/' },
        { text: 'Node.js 专栏', link: 'https://www.yuque.com/egg/nodejs' },
      ],
    },
    {
      text: `v${version}`,
      items: [
        {
          text: 'v3.x',
          link: 'https://v3.eggjs.org',
        },
        {
          text: 'Plugins',
          link: 'https://github.com/search?q=topic%3Aegg-plugin&type=Repositories',
        },
        {
          text: 'Releases',
          link: 'https://github.com/eggjs/egg/releases',
        },
      ],
    },
  ];
}

// Chinese navigation
function navZhCN(): DefaultTheme.NavItem[] {
  return [
    {
      text: '简介',
      link: '/zh-CN/intro/overview',
      activeMatch: '/zh-CN/intro/',
    },
    {
      text: '基础功能',
      link: '/zh-CN/basics/structure',
      activeMatch: '/zh-CN/basics/',
    },
    {
      text: '高级功能',
      link: '/zh-CN/advanced/',
      activeMatch: '/zh-CN/advanced/',
    },
    { text: '核心功能', link: '/zh-CN/core/', activeMatch: '/zh-CN/core/' },
    {
      text: '教程',
      link: '/zh-CN/tutorials/',
      activeMatch: '/zh-CN/tutorials/',
    },
    {
      text: '社区',
      activeMatch: '/zh-CN/community/',
      items: [
        { text: '社区', link: '/zh-CN/community/' },
        {
          text: '参与贡献',
          link: 'https://github.com/eggjs/egg/blob/next/CONTRIBUTING.zh-CN.md',
        },
        { text: '常见问题', link: '/zh-CN/community/faq' },
        { text: '常见错误', link: '/zh-CN/faq/' },
        { text: 'CNode 社区', link: 'https://cnodejs.org/' },
        { text: 'Node.js 专栏', link: 'https://www.yuque.com/egg/nodejs' },
      ],
    },
    {
      text: `v${version}`,
      items: [
        {
          text: 'v3.x',
          link: 'https://v3.eggjs.org',
        },
        {
          text: '插件列表',
          link: 'https://github.com/search?q=topic%3Aegg-plugin&type=Repositories',
        },
        {
          text: '发布日志',
          link: 'https://github.com/eggjs/egg/releases',
        },
      ],
    },
  ];
}

// English sidebars
function sidebarIntro(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Introduction',
      items: [
        { text: 'Overview', link: 'overview' },
        { text: 'Quick Start', link: 'quickstart' },
        { text: 'Progressive Development', link: 'progressive' },
        { text: 'Egg & Koa', link: 'egg-and-koa' },
        { text: 'Migration Guide', link: 'migration' },
      ],
    },
  ];
}

function sidebarBasics(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Basics',
      items: [
        { text: 'Directory Structure', link: 'structure' },
        { text: 'Dependency Injection', link: 'di' },
        { text: 'Controller', link: 'controller' },
        { text: 'HTTP Controller', link: 'httpcontroller' },
        { text: 'MCP Controller', link: 'mcpcontroller' },
        { text: 'Schedule Controller', link: 'schedule' },
        { text: 'Parameter Validation', link: 'ajv' },
        { text: 'Aspect-Oriented Programming', link: 'aop' },
        { text: 'Background Task', link: 'backgroundTask' },
        { text: 'Event Bus', link: 'eventbus' },
        { text: 'Built-in Objects', link: 'objects' },
        { text: 'Runtime Environment', link: 'env' },
        { text: 'Configuration', link: 'config' },
        { text: 'AOP Middleware (Recommended)', link: 'aop-middleware' },
        { text: 'Koa Middleware', link: 'middleware' },
        { text: 'Plugin', link: 'plugin' },
        { text: 'Extend EGG', link: 'extend' },
        { text: 'Application Startup Lifecycle', link: 'app-start' },
        { text: 'Unit Testing', link: 'unittest' },
      ],
    },
  ];
}

function sidebarAdvanced(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Advanced',
      items: [
        { text: 'Loader', link: 'loader' },
        { text: 'Plugin Development', link: 'plugin' },
        { text: 'Framework Development', link: 'framework' },
      ],
    },
  ];
}

function sidebarCore(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Core Features',
      items: [
        { text: 'Development', link: 'development' },
        { text: 'Unit Testing', link: 'unittest' },
        { text: 'Application Deployment', link: 'deployment' },
        { text: 'Logging', link: 'logger' },
        { text: 'HttpClient', link: 'httpclient' },
        { text: 'Cookie & Session', link: 'cookie-and-session' },
        { text: 'Cluster & IPC', link: 'cluster-and-ipc' },
        { text: 'Multi-process Model', link: 'cluster-and-ipc' },
        { text: 'Internationalization', link: 'i18n' },
        { text: 'View Template', link: 'view' },
        { text: 'Security', link: 'security' },
        { text: 'Startup Manifest', link: 'manifest' },
      ],
    },
  ];
}

function sidebarTutorials(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Tutorials',
      items: [
        { text: 'MySQL', link: 'mysql' },
        { text: 'Redis', link: 'redis' },
        { text: 'MongoDB', link: 'mongodb' },
        { text: 'RESTful API', link: 'restful' },
        { text: 'Passport', link: 'passport' },
        { text: 'Socket.io', link: 'socketio' },
      ],
    },
  ];
}

function sidebarCommunity(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Community',
      items: [
        { text: 'Contributing', link: 'contributing' },
        { text: 'Frequently Asked Questions', link: 'faq' },
      ],
    },
  ];
}

// Chinese sidebars
function sidebarIntroZhCN(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '简介',
      items: [
        { text: '概览', link: 'overview' },
        { text: '快速入门', link: 'quickstart' },
        { text: '渐进式开发', link: 'progressive' },
        { text: 'Egg 与 Koa', link: 'egg-and-koa' },
        { text: '迁移指南', link: 'migration' },
      ],
    },
  ];
}

function sidebarBasicsZhCN(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '基础功能',
      items: [
        { text: '目录结构', link: 'structure' },
        { text: '依赖注入', link: 'di' },
        { text: '控制器', link: 'controller' },
        { text: 'HTTP 控制器', link: 'httpcontroller' },
        { text: 'MCP 控制器', link: 'mcpcontroller' },
        { text: 'Schedule 控制器', link: 'schedule' },
        { text: '参数校验', link: 'ajv' },
        { text: '切面编程', link: 'aop' },
        { text: '异步任务', link: 'backgroundTask' },
        { text: '事件中枢', link: 'eventbus' },
        { text: '内置对象', link: 'objects' },
        { text: '运行环境', link: 'env' },
        { text: '配置', link: 'config' },
        { text: 'AOP 中间件(推荐)', link: 'aop-middleware' },
        { text: 'Koa 中间件', link: 'middleware' },
        { text: '插件', link: 'plugin' },
        { text: '框架扩展', link: 'extend' },
        { text: '启动自定义', link: 'app-start' },
        { text: '单元测试', link: 'unittest' },
      ],
    },
  ];
}

function sidebarAdvancedZhCN(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '高级功能',
      items: [
        { text: '加载器', link: 'loader' },
        { text: '插件开发', link: 'plugin' },
        { text: '框架开发', link: 'framework' },
        { text: '多进程研发模式增强', link: 'cluster-client' },
        { text: 'View 插件开发', link: 'view-plugin' },
        { text: '升级你的生命周期事件函数', link: 'loader-update' },
        { text: '对象生命周期', link: 'lifecycle' },
      ],
    },
  ];
}

function sidebarCoreZhCN(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '核心功能',
      items: [
        { text: '本地开发', link: 'development' },
        { text: '单元测试', link: 'unittest' },
        { text: '应用部署', link: 'deployment' },
        { text: '日志', link: 'logger' },
        { text: 'HttpClient', link: 'httpclient' },
        { text: 'Cookie 与 Session', link: 'cookie-and-session' },
        { text: '多进程模型', link: 'cluster-and-ipc' },
        { text: '国际化', link: 'i18n' },
        { text: '模板渲染', link: 'view' },
        { text: '安全', link: 'security' },
        { text: '启动清单', link: 'manifest' },
      ],
    },
  ];
}

function sidebarTutorialsZhCN(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '教程',
      items: [
        { text: 'MySQL', link: 'mysql' },
        // { text: 'Redis', link: 'redis' },
        // { text: 'MongoDB', link: 'mongodb' },
        { text: 'RESTful API', link: 'restful' },
        { text: 'Passport 鉴权', link: 'passport' },
        { text: 'Socket.io', link: 'socketio' },
        { text: 'Assets 静态资源', link: 'assets' },
        { text: 'Proxy 代理模式', link: 'proxy' },
        // { text: 'Sequelize', link: 'sequelize' },
        { text: 'TypeScript', link: 'typescript' },
      ],
    },
  ];
}

function sidebarCommunityZhCN(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '社区',
      items: [
        // { text: '文章', link: 'articles' },
        { text: '参与贡献', link: 'contributing' },
        { text: '常见问题', link: 'faq' },
      ],
    },
  ];
}

function sidebarFaq(): DefaultTheme.SidebarItem[] {
  const faqFiles = fs.readdirSync(path.join(import.meta.dirname, '../docs/faq'));
  const faqItems = faqFiles.map((file) => ({
    text: file.replace('.md', ''),
    link: `${file}`,
  }));
  return [
    {
      text: 'FAQ',
      items: faqItems,
    },
  ];
}
