title: 教程
---
- [快速入门](../intro/quickstart.md)
- [渐进式开发](./progressive.md)
- [RESTful API](./restful.md)

## 模板引擎

框架内置 [egg-view] 作为模板解决方案，并支持多模板渲染，每个模板引擎都以插件的方式引入，但保持渲染的 API 一致。查看[如何使用模板](../core/view.md)，如果想更深入的了解，可以查看[模板插件开发](../advanced/view-plugin.md)。

可使用以下模板引擎，更多[查看](https://github.com/search?utf8=%E2%9C%93&q=topic%3Aegg-view&type=Repositories&ref=searchresults)

- [egg-view-nunjucks]
- [egg-view-ejs]
- [egg-view-handlebars]
- [egg-view-pug]
- [egg-view-xtpl]

## 数据库

官方 [ORM 模型还在设计中](https://github.com/eggjs/egg/issues/388)，但现在可以使用

- [egg-sequelize]
- [egg-mongoose]
- [egg-mysql]，可查看 [MySQL 教程](./mysql.md)


[egg-sequelize]: https://github.com/eggjs/egg-sequelize
[egg-mongoose]: https://github.com/eggjs/egg-mongoose
[egg-mysql]: https://github.com/eggjs/egg-mysql
[egg-view]: https://github.com/eggjs/egg-view
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[egg-view-ejs]: https://github.com/eggjs/egg-view-ejs
[egg-view-handlebars]: https://github.com/eggjs/egg-view-handlebars
[egg-view-pug]: https://github.com/chrisyip/egg-view-pug
[egg-view-xtpl]: https://github.com/eggjs/egg-view-xtpl
