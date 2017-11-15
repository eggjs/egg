title: Egg.js 是什么?
---

**Egg.js 为企业级框架和应用而生**，我们希望由 Egg.js 孕育出更多上层框架，帮助开发团队和开发人员降低开发和维护成本。

> 注：Egg.js 缩写为 Egg

## 设计原则

我们深知企业级应用在追求规范和共建的同时，还需要考虑如何平衡不同团队之间的差异，求同存异。所以我们没有选择社区常见框架的大集市模式（集成如数据库、模板引擎、前端框架等功能），而是专注于提供 Web 开发的核心功能和一套灵活可扩展的插件机制。我们不会做出技术选型，因为固定的技术选型会使框架的扩展性变差，无法满足各种定制需求。通过 Egg，团队的架构师和技术负责人可以非常容易地基于自身的技术架构在 Egg 基础上扩展出适合自身业务场景的框架。

Egg 的插件机制有很高的可扩展性，**一个插件只做一件事**（比如 [Nunjucks] 模板封装成了 [egg-view-nunjucks](https://github.com/eggjs/egg-view-nunjucks)、MySQL 数据库封装成了 [egg-mysql](https://github.com/eggjs/egg-mysql)）。Egg 通过框架聚合这些插件，并根据自己的业务场景定制配置，这样应用的开发成本就变得很低。

Egg 奉行『**约定优于配置**』，按照[一套统一的约定](../advanced/loader.md)进行应用开发，团队内部采用这种方式可以减少开发人员的学习成本，开发人员不再是『钉子』，可以流动起来。没有约定的团队，沟通成本是非常高的，比如有人会按目录分栈而其他人按目录分功能，开发者认知不一致很容易犯错。但约定不等于扩展性差，相反 Egg 有很高的扩展性，可以按照团队的约定定制框架。使用 [Loader](../advanced/loader.md) 可以让框架根据不同环境定义默认配置，还可以覆盖 Egg 的默认约定。

## 与社区框架的差异

[Express] 是 Node.js 社区广泛使用的框架，简单且扩展性强，非常适合做个人项目。但框架本身缺少约定，标准的 MVC 模型会有各种千奇百怪的写法。Egg 按照约定进行开发，奉行『约定优于配置』，团队协作成本低。

[Sails] 是和 Egg 一样奉行『约定优于配置』的框架，扩展性也非常好。但是相比 Egg，[Sails] 支持 Blueprint REST API、[WaterLine] 这样可扩展的 ORM、前端集成、WebSocket 等，但这些功能都是由 Sails 提供的。而 Egg 不直接提供功能，只是集成各种功能插件，比如实现 egg-blueprint，egg-waterline 等这样的插件，再使用 sails-egg 框架整合这些插件就可以替代 [Sails] 了。

## 特性

- 提供基于 Egg [定制上层框架](../advanced/framework.md)的能力
- 高度可扩展的[插件机制](../basics/plugin.md)
- 内置[多进程管理](../advanced/cluster-client.md)
- 基于 [Koa] 开发，性能优异
- 框架稳定，测试覆盖率高
- [渐进式开发](../tutorials/progressive.md)

[Sails]: http://sailsjs.com
[Express]: http://expressjs.com
[Koa]: http://koajs.com
[Nunjucks]: https://mozilla.github.io/nunjucks
[WaterLine]: https://github.com/balderdashy/waterline
