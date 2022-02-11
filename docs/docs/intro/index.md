---
title: What is Egg?
order: 0
nav:
  title: Intro
  order: 1
---

**Egg is born for building enterprise application and framework**，we hope Egg will give birth to more application framework to help developers and developing teams reduce development and maintenance costs.

## Design principles

Since we know well that enterprise applications need to consider how to balance the differences between different teams, seeking common ground while reserving differences in the pursuit of clarifying specification and cooperation, we focus on providing core features for Web development and a flexible and extensible plugin mechanism instead of giant bazaar mode which is popular in common Web frameworks (with integrated such as database, template engine, front-end framework and other functions). We will not make a technical selection because default technical selection makes the scalability of the framework too poor to meet a variety of custom requirements. With the help of Egg, it is very easy for architects and technical leaders to build their own framework which is suitable for their business scenarios based on the existing technology stack .

The plugin mechanism of Egg is very extensible, **one purpose for one plugin**(Eg: [Nunjucks] is encapsulated into [egg-view-nunjucks](https://github.com/eggjs/egg-view-nunjucks), and MySQL is encapsulated into [egg-mysql](https://github.com/eggjs/egg-mysql)). Aggregating the plugins and customizing the configurations according to their own business scenarios greatly reduces the development cost.

Egg is a convention-over-configuration framework, follows the [Loader](./advanced/loader.md) to do the development, it helps to reduce the cost of learning. Developers no longer work as 'nails'. The cost of communication is very high for a team without convention. It is easy to get fault without convention. However convention is not equal to difficult extension, instead, Egg does well in extension part, you can build your own framework according to team convention. [Loader](./advanced/loader.md) can help load different default configuration in a different environment, Egg default convention can also be covered by your own.

## Differences Between Community Framework

[Express] is well used in the Node.js community, it is easy and extensible, fits personal projects a lot. However, without default convention, the standard mvc model has lots of strange impl which would lead to misunderstandings. Egg's teamwork cost is really low by following convention convention-over-configuration.

[Sails] is a framework that also follows convention-over-configuration,it does well in extensible work. Compared with Egg, [Sails] supports blueprint REST API, [WaterLine] , Frontend integration, WebSocket and so on, all of these are provided by [Sails]. Egg does not provide these functions, it only has the integration of different functional extensions, such as egg-blueprint, egg-waterline, if you use sails-egg to integrate these extensions, [Sails] can be replaced.

## Features

- Provide capability to [customizd framework](./advanced/framework.md) base on Egg
- Highly extensible [plugin mechanism](./basics/plugin.md)
- Built-in [cluster](./advanced/cluster-client.md)
- Based on [Koa] with high performance
- Stable core framework with high test coverage
- [Progressive development](./intro/progressive.md)

[sails]: http://sailsjs.com
[express]: http://expressjs.com
[koa]: http://koajs.com
[nunjucks]: https://mozilla.github.io/nunjucks
[waterline]: https://github.com/balderdashy/waterline
