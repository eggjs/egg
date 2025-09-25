import { defineConfig } from 'vitepress'

export default defineConfig({
  srcDir: 'docs',
  appearance: 'dark',
  ignoreDeadLinks: 'localhostLinks',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#22ab28' }],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      title: 'Egg',
      description: 'Born to build better enterprise frameworks and apps',
      
      themeConfig: {
        logo: '/logo.svg',
        siteTitle: 'Egg',
        
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Get Started', link: '/intro/quickstart' },
          { text: 'GitHub', link: 'https://github.com/eggjs/egg' },
          { text: 'Release', link: 'https://github.com/eggjs/egg/releases' },
          { text: 'Plugins', link: 'https://github.com/search?q=topic%3Aegg-plugin&type=Repositories' }
        ],

        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'Overview', link: '/intro/' },
              { text: 'Quick Start', link: '/intro/quickstart' },
              { text: 'Egg & Koa', link: '/intro/egg-and-koa' },
              { text: 'Progressive', link: '/intro/progressive' },
              { text: 'Migration Guide', link: '/intro/migration' }
            ]
          },
          {
            text: 'Basics',
            items: [
              { text: 'Overview', link: '/basics/' },
              { text: 'Directory Structure', link: '/basics/structure' },
              { text: 'Built-in Objects', link: '/basics/objects' },
              { text: 'Runtime Environment', link: '/basics/env' },
              { text: 'Configuration', link: '/basics/config' },
              { text: 'Middleware', link: '/basics/middleware' },
              { text: 'Router', link: '/basics/router' },
              { text: 'Controller', link: '/basics/controller' },
              { text: 'Service', link: '/basics/service' },
              { text: 'Plugin', link: '/basics/plugin' },
              { text: 'Scheduled Tasks', link: '/basics/schedule' },
              { text: 'Extend', link: '/basics/extend' },
              { text: 'App Start', link: '/basics/app-start' }
            ]
          },
          {
            text: 'Core Features',
            items: [
              { text: 'Overview', link: '/core/' },
              { text: 'Development', link: '/core/development' },
              { text: 'Unit Testing', link: '/core/unittest' },
              { text: 'Logger', link: '/core/logger' },
              { text: 'HttpClient', link: '/core/httpclient' },
              { text: 'Cookie & Session', link: '/core/cookie-and-session' },
              { text: 'Cluster & IPC', link: '/core/cluster-and-ipc' },
              { text: 'View Template', link: '/core/view' },
              { text: 'i18n', link: '/core/i18n' },
              { text: 'Error Handling', link: '/core/error-handling' },
              { text: 'Security', link: '/core/security' },
              { text: 'Deployment', link: '/core/deployment' }
            ]
          },
          {
            text: 'Advanced',
            items: [
              { text: 'Overview', link: '/advanced/' },
              { text: 'Loader', link: '/advanced/loader' },
              { text: 'Plugin Development', link: '/advanced/plugin' },
              { text: 'Framework Development', link: '/advanced/framework' },
              { text: 'Loader Updates', link: '/advanced/loader-update' },
              { text: 'Cluster Client', link: '/advanced/cluster-client' },
              { text: 'View Plugin', link: '/advanced/view-plugin' }
            ]
          },
          {
            text: 'Tutorials',
            items: [
              { text: 'Overview', link: '/tutorials/' },
              { text: 'MySQL', link: '/tutorials/mysql' },
              { text: 'Sequelize', link: '/tutorials/sequelize' },
              { text: 'TypeScript', link: '/tutorials/typescript' },
              { text: 'Socket.IO', link: '/tutorials/socketio' },
              { text: 'RESTful API', link: '/tutorials/restful' },
              { text: 'Passport', link: '/tutorials/passport' },
              { text: 'Proxy', link: '/tutorials/proxy' },
              { text: 'Assets', link: '/tutorials/assets' }
            ]
          },
          {
            text: 'Community',
            items: [
              { text: 'Overview', link: '/community/' },
              { text: 'Contributing', link: '/community/CONTRIBUTING' },
              { text: 'FAQ', link: '/community/faq' },
              { text: 'Style Guide', link: '/community/style-guide' }
            ]
          }
        ],

        socialLinks: [
          { icon: 'github', link: 'https://github.com/eggjs/egg' }
        ],

        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2016-present Eggjs Team'
        },

        search: {
          provider: 'local'
        }
      }
    },
    
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Egg',
      description: '为企业级框架和应用而生',
      
      themeConfig: {
        logo: '/logo.svg',
        siteTitle: 'Egg',
        
        nav: [
          { text: '首页', link: '/zh-CN/' },
          { text: '快速开始', link: '/zh-CN/intro/quickstart' },
          { text: 'GitHub', link: 'https://github.com/eggjs/egg' },
          { text: '插件列表', link: 'https://github.com/search?q=topic%3Aegg-plugin&type=Repositories' },
          { text: '发布日志', link: 'https://github.com/eggjs/egg/releases' }
        ],

        sidebar: [
          {
            text: '介绍',
            items: [
              { text: '概述', link: '/zh-CN/intro/' },
              { text: '快速入门', link: '/zh-CN/intro/quickstart' },
              { text: 'Egg & Koa', link: '/zh-CN/intro/egg-and-koa' },
              { text: '渐进式开发', link: '/zh-CN/intro/progressive' },
              { text: '从 1.x 升级', link: '/zh-CN/intro/migration' }
            ]
          },
          {
            text: '基础功能',
            items: [
              { text: '概述', link: '/zh-CN/basics/' },
              { text: '目录结构', link: '/zh-CN/basics/structure' },
              { text: '内置对象', link: '/zh-CN/basics/objects' },
              { text: '运行环境', link: '/zh-CN/basics/env' },
              { text: '配置', link: '/zh-CN/basics/config' },
              { text: '中间件', link: '/zh-CN/basics/middleware' },
              { text: '路由', link: '/zh-CN/basics/router' },
              { text: 'Controller', link: '/zh-CN/basics/controller' },
              { text: 'Service', link: '/zh-CN/basics/service' },
              { text: '插件', link: '/zh-CN/basics/plugin' },
              { text: '定时任务', link: '/zh-CN/basics/schedule' },
              { text: '框架扩展', link: '/zh-CN/basics/extend' },
              { text: '启动自定义', link: '/zh-CN/basics/app-start' }
            ]
          },
          {
            text: '核心功能',
            items: [
              { text: '概述', link: '/zh-CN/core/' },
              { text: '本地开发', link: '/zh-CN/core/development' },
              { text: '单元测试', link: '/zh-CN/core/unittest' },
              { text: '日志', link: '/zh-CN/core/logger' },
              { text: 'HttpClient', link: '/zh-CN/core/httpclient' },
              { text: 'Cookie & Session', link: '/zh-CN/core/cookie-and-session' },
              { text: '多进程模型', link: '/zh-CN/core/cluster-and-ipc' },
              { text: '模板渲染', link: '/zh-CN/core/view' },
              { text: '国际化', link: '/zh-CN/core/i18n' },
              { text: '异常处理', link: '/zh-CN/core/error-handling' },
              { text: '安全', link: '/zh-CN/core/security' },
              { text: '应用部署', link: '/zh-CN/core/deployment' }
            ]
          },
          {
            text: '高级功能',
            items: [
              { text: '概述', link: '/zh-CN/advanced/' },
              { text: 'Loader', link: '/zh-CN/advanced/loader' },
              { text: '插件开发', link: '/zh-CN/advanced/plugin' },
              { text: '框架开发', link: '/zh-CN/advanced/framework' },
              { text: 'Loader 更新', link: '/zh-CN/advanced/loader-update' },
              { text: 'Cluster Client', link: '/zh-CN/advanced/cluster-client' },
              { text: '模板插件开发', link: '/zh-CN/advanced/view-plugin' }
            ]
          },
          {
            text: '教程',
            items: [
              { text: '概述', link: '/zh-CN/tutorials/' },
              { text: 'MySQL', link: '/zh-CN/tutorials/mysql' },
              { text: 'Sequelize', link: '/zh-CN/tutorials/sequelize' },
              { text: 'TypeScript', link: '/zh-CN/tutorials/typescript' },
              { text: 'Socket.IO', link: '/zh-CN/tutorials/socketio' },
              { text: 'RESTful API', link: '/zh-CN/tutorials/restful' },
              { text: 'Passport', link: '/zh-CN/tutorials/passport' },
              { text: 'Proxy', link: '/zh-CN/tutorials/proxy' },
              { text: '静态资源', link: '/zh-CN/tutorials/assets' }
            ]
          },
          {
            text: '社区',
            items: [
              { text: '概述', link: '/zh-CN/community/' },
              { text: '贡献代码', link: '/zh-CN/community/CONTRIBUTING' },
              { text: '常见问题', link: '/zh-CN/community/faq' },
              { text: '代码风格指南', link: '/zh-CN/community/style-guide' }
            ]
          }
        ],

        socialLinks: [
          { icon: 'github', link: 'https://github.com/eggjs/egg' }
        ],

        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2016-present Eggjs Team'
        },

        search: {
          provider: 'local'
        }
      }
    }
  },

  sitemap: {
    hostname: 'https://eggjs.org'
  }
})