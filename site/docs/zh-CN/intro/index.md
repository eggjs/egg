---
title: Egg.js 是什么
order: 0
nav:
  title: 指南
  order: 1
---

**Egg.js 为企业级框架和应用而生**。我们希望 Egg.js 能孕育出更多上层框架，帮助开发团队和开发人员降低开发和维护成本。

> 注：Egg.js 的缩写为 Egg

## 设计原则

我们深知企业级应用在追求规范和共建的同时，还需考虑如何平衡不同团队之间的差异，求同存异。因此，我们没有选择社区常见的大集市模式（如集成数据库、模板引擎、前端框架等），而是专注于提供 Web 开发的核心功能和灵活可扩展的插件机制。我们不会做出技术选型，这是因为一旦技术选型固定，框架的扩展性就会变差，无法满足各种定制需求。通过 Egg，企业的架构师和技术负责人能够轻松地在 Egg 基础上，扩展出符合自身技术架构和业务场景的框架。

Egg 的插件机制具备很高的可扩展性，**一个插件仅完成一件事情**（例如 [Nunjucks] 模板封装成了 [egg-view-nunjucks](https://github.com/eggjs/egg-view-nunjucks)，MySQL 数据库封装成了 [egg-mysql](https://github.com/eggjs/egg-mysql)）。Egg 通过框架聚合这些插件，并根据自己的业务场景定制配置，从而极大降低了应用的开发成本。

Egg 奉行“**约定优于配置**”。按照[一套统一的约定](./advanced/loader.md)开发应用时，团队成员可以减少学习成本，不再是“钉子”，能流动起来。未有约定的团队，沟通成本极高，因为每个人的开发习惯可能都不同，容易犯错。但约定并不意味着扩展性差，Egg 的扩展性极高，可根据不同团队的约定来定制框架。使用 [Loader](./advanced/loader.md)，框架能够根据不同环境定义默认配置，并覆盖 Egg 的默认约定。

## 与社区框架的差异

[Express] 是 Node.js 社区广泛使用的框架，简洁且扩展性强，很适合个人项目。不过，由于缺少约定，MVC 模型实现方式多种多样。Egg 则是按照固定约定进行开发，低协作成本。

[Sails] 也是奉行“**约定优于配置**”的框架，扩展性同样很好。相比 Egg，[Sails] 提供了 Blueprint REST API、[Waterline] 这样的 ORM、前端集成、WebSocket 等功能。而 Egg 不会直接提供这些功能，但可以聚合各种功能插件（如 egg-blueprint，egg-waterline 等），再用 sails-egg 框架整合这些插件后，就可以替代 [Sails]。

## 特性

- 可[定制上层框架](./advanced/framework.md)的能力
- 高度可扩展的[插件机制](./basics/plugin.md)
- 内置[多进程管理](./advanced/cluster-client.md)
- 基于 [Koa] 开发，性能优异
- 框架稳定，测试覆盖率高
- [渐进式开发](./intro/progressive.md)

[sails]: http://sailsjs.com
[express]: http://expressjs.com
[koa]: http://koajs.com
[nunjucks]: https://mozilla.github.io/nunjucks
[waterline]: https://github.com/balderdashy/waterline
