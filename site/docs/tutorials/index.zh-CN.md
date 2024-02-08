---
title: 教程
nav:
  title: 教程
  order: 2
---

- [快速入门](./intro/quickstart.md)
- [渐进式开发](./intro/progressive.md)
- [RESTful API](./tutorials/restful.md)

## 骨架类型说明

你可以使用骨架类型，像下面这样：

```bash
$ npm init egg --type=simple
```

### 选项

| 骨架类型  |                  说明 |
| :-------: | --------------------: |
|  simple   | 简单 egg 应用程序骨架 |
|   empty   | 空的 egg 应用程序骨架 |
|  plugin   |       egg 插件骨架   |
| framework |    egg 框架骨架      |

## 模板引擎

框架内置 [egg-view] 作为模板解决方案，并支持多模板渲染。每个模板引擎都以插件的形式引入，但保持渲染的 API 一致。查看[如何使用模板](./core/view.md)；如果想更深入地了解，可以查看[模板插件开发](./advanced/view-plugin.md)。

可使用以下模板引擎，更多请[查看](https://github.com/search?utf8=%E2%9C%93&q=topic%3Aegg-view&type=Repositories&ref=searchresults)：

- [egg-view-nunjucks]
- [egg-view-react]
- [egg-view-vue]
- [egg-view-ejs]
- [egg-view-handlebars]
- [egg-view-pug]
- [egg-view-xtpl]

## 数据库

官方维护的 ORM 模型是基于 [Leoric] 实现的 [egg-orm]。目前可用的数据库插件包括：

- [egg-orm]
- [egg-sequelize]
- [egg-mongoose]
- [egg-mysql]，可查看 [MySQL 教程](./tutorials/mysql.md)
- [egg-graphql]

[egg-sequelize]: https://github.com/eggjs/egg-sequelize
[egg-mongoose]: https://github.com/eggjs/egg-mongoose
[egg-mysql]: https://github.com/eggjs/egg-mysql
[egg-view]: https://github.com/eggjs/egg-view
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[egg-view-ejs]: https://github.com/eggjs/egg-view-ejs
[egg-view-handlebars]: https://github.com/eggjs/egg-view-handlebars
[egg-view-pug]: https://github.com/chrisyip/egg-view-pug
[egg-view-xtpl]: https://github.com/eggjs/egg-view-xtpl
[egg-view-react]: https://github.com/eggjs/egg-view-react
[egg-view-vue]: https://github.com/eggjs/egg-view-vue
[egg-graphql]: https://github.com/eggjs/egg-graphql
[egg-orm]: https://github.com/eggjs/egg-orm/blob/master/Readme.zh-CN.md
[Leoric]: https://leoric.js.org/zh
