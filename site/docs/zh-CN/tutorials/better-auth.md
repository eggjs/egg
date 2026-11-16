# Better Auth 鉴权

[Better Auth](https://www.better-auth.com/) 提供认证端点，并管理自己的用户、会话和 Cookie。本教程将它的 Node.js 处理器挂载到 Egg，再通过 Better Auth 的会话 API 保护业务接口。

## 前提条件

本示例使用 **Egg 4 TypeScript ESM 应用**（`"type": "module"`）和 **>=22.18.0** 的 Node.js。应用结构可以参考 [TypeScript 示例](https://github.com/eggjs/egg/tree/main/examples/helloworld-typescript)。

Better Auth 的会话与 [Egg Session](../core/cookie-and-session.md) 独立，需要通过下文的 `auth.api.getSession()` 读取。此集成不会自动设置 `ctx.session` 或 [Passport](./passport.md) 提供的 `ctx.user` 扩展。

## 安装并配置 Better Auth

在应用根目录运行以下命令。本示例使用 SQLite，也可以使用 Better Auth 支持的[其他数据库](https://www.better-auth.com/docs/concepts/database)。

```bash
npm install better-auth better-sqlite3
npm install --save-dev @types/better-sqlite3
```

在即将执行迁移和启动 Egg 的终端中设置环境变量：

```bash
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
export BETTER_AUTH_URL=http://localhost:7001
export EGG_KEYS="$(openssl rand -base64 32)"
```

`BETTER_AUTH_SECRET` 至少需要 32 个字符。`EGG_KEYS` 用于 Egg 的 Cookie 签名；如果应用已经配置了 `keys`，保留原有配置即可。请在部署环境中持久保存这些密钥，并确保所有应用 Worker 及每次重启使用相同的值。

在 Egg 自动加载的 `app/` 目录之外创建共享的 Better Auth 实例：

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';

export const auth = betterAuth({
  database: new Database('./auth.sqlite') as Database.Database,
  emailAndPassword: {
    enabled: true,
  },
});
```

这里显式使用 `Database.Database` 类型，以便 Egg 的 TypeScript 配置在生成声明文件时正确引用数据库类型。

Better Auth 会从环境变量读取 `BETTER_AUTH_SECRET` 和 `BETTER_AUTH_URL`。通过它的 [CLI](https://www.better-auth.com/docs/concepts/cli) 创建认证所需的数据表：

```bash
npx auth@latest migrate --config ./lib/auth.ts
```

不要将 `auth.sqlite` 和 SQLite 日志文件提交到版本控制。

## 配置 Egg 中间件

将以下配置合并到现有配置中，并保留应用的其他配置项：

```typescript
// config/config.default.ts
import { defineConfigFactory } from 'egg';

export default defineConfigFactory(() => ({
  keys: process.env.EGG_KEYS!,
  bodyParser: {
    ignore: /^\/api\/auth(?:\/|$)/,
  },
  security: {
    csrf: {
      ignore: /^\/api\/auth(?:\/|$)/,
    },
  },
}));
```

Node.js 处理器需要读取原始请求体，因此要让 Egg 的 bodyParser 跳过认证端点。Better Auth 会自行执行这些端点的 Origin 和 CSRF 检查，所以 Egg 的 CSRF 中间件也需要跳过它们。应用其他接口仍应启用 Egg 的 [CSRF 防护](../core/security.md#安全威胁-csrf-的防范)。

该正则表达式匹配 `/api/auth` 及其子路径，不会匹配 `/api/authors`。如果修改 Better Auth 的 `basePath`，请同步更新两处 ignore 规则和下文的路由。

## 挂载处理器并读取会话

在路由中添加认证处理器和受保护的 `/api/me` 接口：

```typescript
// app/router.ts
import type { Application, Context } from 'egg';

import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';

import { auth } from '../lib/auth.ts';

const handleAuth = toNodeHandler(auth);

export default (app: Application) => {
  app.router.all(/^\/api\/auth(?:\/|$)/, async (ctx: Context) => {
    ctx.respond = false;
    await handleAuth(ctx.req, ctx.res);
  });

  app.router.get('/api/me', async (ctx: Context) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(ctx.req.headers),
    });

    if (!session) {
      ctx.status = 401;
      ctx.body = { message: 'Unauthorized' };
      return;
    }

    ctx.body = { user: session.user };
  });
};
```

`ctx.respond = false` 让 Node.js 处理器直接向 `ctx.res` 写入状态码、响应头、Cookie 和响应体。`/api/me` 仍使用 Egg 的正常响应机制，并将请求头转交给 Better Auth，以便读取会话 Cookie。

## 验证集成

在已设置环境变量的终端中启动应用：

```bash
npm run dev
```

在另一个终端中检查认证处理器和匿名业务请求：

```bash
curl -i http://localhost:7001/api/auth/ok
curl -i http://localhost:7001/api/me
```

第一个请求返回 `200` 和 `{"ok":true}`，第二个返回 `401`。

创建用户并保存会话 Cookie：

```bash
curl -i -c cookies.txt http://localhost:7001/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:7001' \
  --data '{"name":"Alice","email":"alice@example.com","password":"replace-with-a-strong-password"}'
```

携带该 Cookie 请求受保护的接口：

```bash
curl -i -b cookies.txt http://localhost:7001/api/me
```

此时会返回 `200` 和用户信息。Cookie 文件包含登录凭据，不要将其提交到版本控制。

## 部署

将 `BETTER_AUTH_URL` 设置为应用对外提供服务的 URL，并在生产环境使用 HTTPS。本教程使用浏览器与 Egg 同源的场景。如果浏览器客户端位于其他 Origin，需要为 [Egg CORS](https://github.com/eggjs/cors) 配置明确的允许来源及凭据支持，将客户端来源加入 Better Auth 的 [`trustedOrigins`](https://www.better-auth.com/docs/reference/options#trustedorigins)，并在客户端请求中携带凭据。同时根据部署方式配置合适的 [Cookie 属性](https://www.better-auth.com/docs/concepts/cookies)。
