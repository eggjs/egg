# `@eggjs/tegg-orm-decorator`

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-orm-decorator.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-orm-decorator.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-orm-decorator
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-orm-decorator/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-orm-decorator
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-orm-decorator.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-orm-decorator

## Install

```shell
npm i --save @eggjs/tegg-orm-decorator
```

## Define Model

```ts
import { Model, Attribute } from '@eggjs/tegg-orm-decorator';
import leoric from 'leoric';

const { DataTypes, Bone } = leoric;

@Model()
export class App extends Bone {
  @Attribute(DataTypes.STRING)
  name: string;
  @Attribute(DataTypes.STRING)
  desc: string;
}
```

## Use Model

```ts
import { SingletonProto, Inject } from '@eggjs/tegg';
import { App } from './model/App';

@SingletonProto()
export class AppService {
  @Inject()
  App: typeof App;

  async createApp(data: { name: string; desc: string }): Promise<App> {
    const bone = await this.App.create(data as any);
    return bone as App;
  }

  async findApp(name: string): Promise<App | null> {
    const app = await this.App.findOne({ name });
    return app as App;
  }
}
```
