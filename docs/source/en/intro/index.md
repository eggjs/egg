title: What is Egg?
---

**Egg is born for building enterprise application and framework**，we hope Egg will give birth to more application framework to help developers and developing team reduce development and maintenance costs.
## Design principles

Since we know well that enterprise applications need to consider how to balance the differences between different teams, seeking common ground while reserving differences in the pursuit of clarifying specification and cooperation, we focus on providing core features for Web development and a flexible and extensible plug-in mechanism instead of giant bazaar mode which is popular in common Web frameworks(with integrated such as database, template engine, front-end framework and other functions). We will not make technical selection because default technical selection makes the scalability of the framework too poor to meet a variety of custom requirements. With the help of Egg , it is very easy for architects and technical leaders to build their own framework which is suitable for their business scenarios based on existing technology stack .

The plug-in mechanism of Egg is very extensible, **one purpose for one plugin**(Eg: [Nunjucks] is encapsulated into [egg-view-nunjucks](https://github.com/eggjs/egg-view-nunjucks), and MySQL is encapsulated into [egg-mysql](https://github.com/eggjs/egg-mysql)). Aggregating the plugins and customizing the configurations according to their own business scenarios greatly reduces the development cost.

Egg is a convention-over-configuration framework, follows the [Loader](../advanced/loader.md) to do the development, it helps to reduce the cost of learning. Developers no longer work as 'nails'. The cost of communication is very high for a team without convention. it is easy to get fault without convention. However convention is not equal to diffcult extension, instead, Egg does well in extension part, you can build your own framework according to team convention.  [Loader](../advanced/loader.md) can help load different default configuration in different environment, Egg default convention can also be covered by your own.

## Differences between community framework

[Express] is well used in Node.js community, it is easy and extensible, fit personal project a lot. However, without default convention, standard mvc model has lots of strange impl which would lead to misunderstandings. Egg's teamwork cost is really low by following convention convention-over-configuration.

[Sails] is a framework that also follows convention-over-configuration,it does well in extensible work. Compared with Egg, [Sails] supports blueprint REST API, [WaterLine] , Frontend integration, WebSocket and so on, all of these are provided by Sails. Egg does not provide these functions, it only has integration of different functional extensions, such as egg-blueprint, egg-waterline, if you use sails-egg to integrate these extensions, [Sails] can be replaced.

## features

- Provide capability to [customizd framework](../advanced/framework.md) base on Egg
- Highly extensible [plug-in mechanism](../basics/plugin.md)
- Built-in [cluster](../advanced/cluster-client.md)
- Based on [Koa] with high performance
- Stable core framework with high test coverage
- [Progressive development](../tutorials/progressive.md)

[Sails]: http://sailsjs.com
[Express]: http://expressjs.com
[Koa]: http://koajs.com
[Nunjucks]: https://mozilla.github.io/nunjucks
[WaterLine]: https://github.com/balderdashy/waterline
