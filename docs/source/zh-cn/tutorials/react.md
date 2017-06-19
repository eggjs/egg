title: 实现 React 同构渲染
---

什么是前后端同构（isomorphic）？同构可以理解为同一个组件或逻辑只编写一次，前后端可以共用。

由于服务端 NodeJS 环境的存在，维护一套业务代码，可以分别在服务器端和前端运行。

## 为什么要前后端同构

React 前后端同构主要是相对于纯 React 浏览器渲染来比较的。

- 更利于 SEO
- 首屏加载更快
- 提高了复用性，业务代码易于维护

## 同构需要解决的问题

- 数据来源与数据同步

前端的数据应该与服务端保持一致，那么前端如何得到服务端的数据呢？很简单，页面渲染完毕之后，把数据挂载到全局对象上即可。

- 服务器端渲染与前端渲染
- 路由
- 消除运行环境的差异

我们可以通过 Webpack 加载器将样式、图片等前端资源作为模块进行引入，但这些资源如果在 Node 中直接引入，是会报错的。
另外一些浏览器端的 api 也需要 hack 掉。


## 技术实现

我们这次进行的同构，选型采用了 egg + egg-react插件 + React + Redux + React-Router + Webpack;

egg + egg-react 插件解决服务端渲染的问题。

### 编写组件代码

### 编写应用代码

### 打包构建

------

完整的代码实现和测试都在 [eggjs/examples/react-isomorphic](https://github.com/eggjs/examples/tree/master/react-isomorphic) 中可以找到。
