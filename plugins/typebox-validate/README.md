# @eggjs/typebox-validate

[![NPM version][npm-image]][npm-url]
[![Test coverage][codecov-image]][codecov-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@eggjs/typebox-validate.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/typebox-validate
[codecov-image]: https://img.shields.io/codecov/c/github/eggjs-community/@eggjs/typebox-validate.svg?style=flat-square
[codecov-url]: https://codecov.io/github/eggjs-community/@eggjs/typebox-validate?branch=master
[snyk-image]: https://snyk.io/test/npm/@eggjs/typebox-validate/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/typebox-validate
[download-image]: https://img.shields.io/npm/dm/@eggjs/typebox-validate.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/typebox-validate

基于 [typebox](https://github.com/sinclairzx81/typebox) 和 [ajv](https://github.com/ajv-validator/ajv) 封装的 egg validate 插件。

## 为什么有这个项目

一直以来，在 typescript 的 egg 项目里，对参数校验 ctx.validate 是比较难受的，比如:

```js
class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    // 写一遍 js 的类型校验
    ctx.validate({
      id: 'string',
      name: {
        type: 'string',
        required: false,
      },
      timestamp: {
        type: 'number',
        required: false,
      },
    }, ctx.params);

    // 写一遍 ts 的类型定义，为了后面拿参数定义
    const params: {
      id: string;
      name?: string;
      timestamp: number;
    } = ctx.params;
    ...
    ctx.body = params.id;
  }
}

export default HomeController;
```

可以看到这里我们写了两遍的类型定义，一遍 js 的定义（用 [parameter](https://github.com/node-modules/parameter) 库的规则），另一遍用 ts 的方式来强转我们的参数类型，方便我们后面写代码的时候能得到 ts 的类型效果。
对于简单的类型写起来还好，但是对于复杂点的参数定义，开发体验就不是那么好了。

这就是这个库想要解决的问题，对于参数校验，写一遍类型就够了：

```diff
+ import { Static, Type } from '@eggjs/typebox-validate/typebox';

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    // 写 js 类型定义
-   ctx.validate({
-     id: 'string',
-     name: {
-       type: 'string',
-       required: false,
-     },
-     timestamp: {
-       type: 'number',
-       required: false,
-     },
-   }, ctx.params);

+   const paramsSchema = Type.Object({
+     id: Type.String(),
+     name: Type.Optional(Type.String()),
+     timestamp: Type.Optional(Type.Integer()),
+   });
    // 直接校验
+   ctx.tValidate(paramsSchema, ctx.params);
    // 不用写 js 类型定义
+   const params: Static<typeof paramsSchema> = ctx.params;
-   const params: {
-     id: string;
-     name?: string;
-     timestamp: number;
-   } = ctx.params;
    ...
    ctx.body = params.id;
  }
}

export default HomeController;
```

用 `Static<typeof typebox>` 推导出的 ts 类型：

![tpian](https://gw.alipayobjects.com/zos/antfincdn/XjH2W7lEB/ad5b628c-9ff9-456d-bb7b-2fb0ac418f1c.png)

## 怎么使用

1. 安装

```js
npm i @eggjs/typebox-validate
```

> 针对 `egg@3.x` 版本，请移步 https://github.com/eggjs-community/egg-typebox-validate

1. 在项目中配置

```js
// config/plugin.ts
import typeboxValidatePlugin from '@eggjs/typebox-validate';

export default {
  ...typeboxValidatePlugin(),
};
```

3. 在业务代码中使用

```diff
+ import { Static, Type } from '@eggjs/typebox-validate/typebox';

// 写在 controller 外面，静态化，性能更好，下面有 benchmark
+ const paramsSchema = Type.Object({
+   id: Type.String(),
+   name: Type.String(),
+   timestamp: Type.Integer(),
+ });

// 可以直接 export 出去，给下游 service 使用
+ export type ParamsType = Static<typeof paramsSchema>;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;

    // 直接校验
+   ctx.tValidate(paramsSchema, ctx.params);
    // 不用写 js 类型定义
+   const params: ParamsType = ctx.params;

    ...
  }
}

export default HomeController;
```

## 除了类型定义 write once 外，还有更多好处

1. 类型组合方式特别香，能解决很多 DRY(Don't Repeat Yourself) 问题。比如有几张 db 表，都定义了 name 必填和 description 选填，那这个规则可以在各个实体类方法中被组合了。

Show me the code!

```ts
export const TYPEBOX_NAME_DESC_OBJECT = Type.Object({
  name: Type.String(),
  description: Type.Optional(Type.String()),
});

// type NameAndDesc = { name: string; description?: string }
type NameAndDesc = Static<typeof TYPEBOX_NAME_DESC_OBJECT>;

// controller User
async create() {
  const { ctx } = this;
  const USER_TYPEBOX = Type.Intersect([
    TYPEBOX_NAME_DESC_OBJECT,
    Type.Object({ avatar: Type.String() }),
  ])
  ctx.tValidate(USER_TYPEBOX, ctx.request.body);

  // 在编辑器都能正确得到提示
  // type User = { name: string; description?: string } & { avatar: string }
  const { name, description, avatar } = ctx.request.body as Static<typeof USER_TYPEBOX>;
  ...
}

// controller Photo
async create() {
  const { ctx } = this;
  const PHOTO_TYPEBOX = Type.Intersect([
    TYPEBOX_NAME_DESC_OBJECT,
    Type.Object({ location: Type.String() }),
  ])
  ctx.tValidate(PHOTO_TYPEBOX, ctx.request.body);

  // 在编辑器都能正确得到提示
  // type Photo = { name: string; description?: string } & { location: string }
  const { name, description, location } = ctx.request.body as Static<typeof PHOTO_TYPEBOX>;
  ...
}
```

2. 校验规则使用的是业界标准的 [json-schema](https://json-schema.org/) 规范，内置很多[开箱即用的类型](https://github.com/ajv-validator/ajv-formats#formats)。

```js
('date-time',
  'time',
  'date',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'uuid',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex');
```

3. 写定义的时候写的是 js 对象(`Type.Number()`)，有类型提示，语法也比较简单，有提示不容易写错；写 parameter 规范的时候，写字符串(`'nunber'`)有时候会不小心写错 😂，再加上它对于复杂嵌套对象的写法还是比较困难的，我每次都会查文档，官方的文档也不全。但是 typebox，就很容易举一反三了。

## 与 egg-validate 性能比较

egg-typebox-validate 底层使用的是 [ajv](https://github.com/ajv-validator/ajv), 官网上宣称是 _**The fastest JSON validator for Node.js and browser.**_

结论是在静态化的场景下，ajv 的性能要比 parameter 好得多，快不是一个数量级，详见[benchmark](./benchmark/ajv-vs-parameter.mjs)

```js
suite
  .add('#ajv', function () {
    const rule = Type.Object({
      name: Type.String(),
      description: Type.Optional(Type.String()),
      location: Type.Enum({ shanghai: 'shanghai', hangzhou: 'hangzhou' }),
    });
    ajv.validate(rule, DATA);
  })
  .add('#ajv define once', function () {
    ajv.validate(typeboxRule, DATA);
  })
  .add('#parameter', function () {
    const rule = {
      name: 'string',
      description: {
        type: 'string',
        required: false,
      },
      location: ['shanghai', 'hangzhou'],
    };
    p.validate(rule, DATA);
  })
  .add('#parameter define once', function () {
    p.validate(parameterRule, DATA);
  });
```

在 MacBook Pro(2.2 GHz 六核Intel Core i7)上，跑出来结果是:

```bash
#ajv x 941 ops/sec ±3.97% (73 runs sampled)
#ajv define once x 17,188,370 ops/sec ±11.53% (73 runs sampled)
#parameter x 2,544,118 ops/sec ±4.68% (79 runs sampled)
#parameter define once x 2,541,590 ops/sec ±5.34% (77 runs sampled)
Fastest is #ajv define once
```

## 从 egg-validate 迁移到这个库的成本

1. 把原来字符串式 js 对象写法迁移到 typebox 的对象写法。typebox 的写法还算简单和容易举一反三
2. 把 `ctx.validate` 替换成 `ctx.tValidate`
3. 建议渐进式迁移，先迁简单的，对业务影响不大的

## 总结

切换到 `@eggjs/typebox-validate` 校验后：

1. 可以解决 ts 项目中参数校验代码写两遍类型的问题，提升代码重用率，可维护性等问题
2. 用标准 json-schema 来做参数校验，是更加标准的业界做法，内置更多业界标准模型

## API

1. `ctx.tValidate` 参数校验失败后，抛出错误，内部实现（错误码、错误标题等）逻辑和 `ctx.validate` 的保持一致

```diff
+ import { Static, Type } from '@eggjs/typebox-validate/typebox';

ctx.tValidate(Type.Object({
  name: Type.String(),
}), ctx.request.body);
```

2. `ctx.tValidateWithoutThrow` 直接校验，不抛出错误

```diff
+ import { Static, Type } from '@eggjs/typebox-validate/typebox';

const valid = ctx.tValidateWithoutThrow(Type.Object({
  name: Type.String(),
}), ctx.request.body);

if (valid) {
  ...
} else {
  const errors = this.app.ajv.errors
  // handle errors
  ...
}
```

3. ⭐⭐⭐ 装饰器 decorator `@Validate([ [rule1, ctx => ctx.xx1], [rule2, ctx => ctx.xx2] ])` 调用（写法更干净，推荐使用!️）

```diff
+ import { Validate, ValidateFactory } from '@eggjs/typebox-validate/decorator';

const ValidateWithRedirect = ValidateFactory(ctx => ctx.redirect('/422'));

class HomeController extends Controller {
+ @Validate([
+   [paramsSchema, ctx => ctx.params],
+   [bodySchema, ctx => ctx.request.body, (ctx, errors) => 'MyErrorPrefix: ' + errors.map(e => e.message).join(', ')],
+ ])
  async index() {
    const { ctx } = this;

    // 直接校验
-   ctx.tValidate(paramsSchema, ctx.params);
-   ctx.tValidate(bodySchema, ctx.request.body);
    // 不用写 js 类型定义
    const params: ParamsType = ctx.params;

    ...
  }
+ @ValidateWithRedirect([paramsSchema, ctx => ctx.params])
  async post() {
    // ...
  }
}

export default HomeController;
```

目前装饰器只支持有 `this.ctx` 的 class 上使用，比如 controller，service 等。也可以通过内置的 `ValidateFactory` 自定义校验失败后的回调逻辑，更多使用案例可以看这个项目里写的测试用例。

## 怎么写 typebox 定义

参考 [https://github.com/sinclairzx81/typebox#types](https://github.com/sinclairzx81/typebox#types)

## 支持 ajv 对 string 的 transform 校验

比如:

```js
const body = { name: '  david   ' };

ctx.tValidate(
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 5, transform: ['trim'] }),
  }),
  body
);
```

1. 是可以通过校验的
2. 会对 body 有副作用，改写 name 字段，trim name 字段，body 会变成 `{ name: 'david' }`

更多 ajv 对 string 的 transform 操作，详见 [https://ajv.js.org/packages/ajv-keywords.html#transform](https://ajv.js.org/packages/ajv-keywords.html#transform)

## 如何写自定义校验规则

比如想校验上传的 string 是否是合法的 json string，我们可以对 Type.String 的 format 做 patch，针对 string 加一个 'json-string' 的 format

1. 在 config.default.ts 里 patch 默认 ajv 实例的规则

```ts
config.typeboxValidate = {
  patchAjv: ajv => {
    ajv.addFormat('json-string', {
      type: 'string',
      validate: x => {
        try {
          JSON.parse(x);
          return true;
        } catch (err) {
          return false;
        }
      },
    });
  },
};
```

2. 使用

```ts
async someFunc() {
  const typebox = Type.Object({
    jsonString: Type.Optional(Type.String({ format: 'json-string' })),
  });

  const res = ctx.tValidate(typebox, { a: '{"a":1}' }) // valid
  const res = ctx.tValidate(typebox, { a: 'wrong{"a":1}' }) // invalid
}
```

当然也可以定义其他各种规则，比如我们常见的 semver 规范，那可以在我们的配置里继续 patch ajv string format

```diff
+ import { valid } from 'semver';

config.typeboxValidate = {
  patchAjv: (ajv) => {
    ajv.addFormat('json-string', {
      type: 'string',
      validate: (x) => {
        try {
          JSON.parse(x);
          return true;
        } catch (err) {
          return false;
        }
      }
    });

+   ajv.addFormat("semver", {
+     type: "string",
+     validate: (x) => valid(x) != null,
+   })
  }
}
```

使用例子：

```ts
async someFunc() {
  const typebox = Type.Object({
    version: Type.String({ format: 'semver' }),
  });

  const res = ctx.tValidate(typebox, { a: '1.0.0' }) // valid
  const res = ctx.tValidate(typebox, { a: 'a.b.c' }) // invalid
}
```

上面例子是 string 的例子，当然也可以对其他类型做其他 patch，比如 number，array 等，限制你的只有想象力。

全部 json-schema 支持的类型：[https://json-schema.org/understanding-json-schema/reference/type.html](https://json-schema.org/understanding-json-schema/reference/type.html)

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
