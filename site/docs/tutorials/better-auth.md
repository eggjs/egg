# Better Auth

[Better Auth](https://www.better-auth.com/) provides authentication endpoints and manages its own users, sessions, and cookies. This tutorial mounts its Node.js handler in Egg and protects an application route with Better Auth's session API.

## Prerequisites

This example uses an **Egg 4 TypeScript application with ESM** (`"type": "module"`) and Node.js **>=22.18.0**. See the [TypeScript example](https://github.com/eggjs/egg/tree/main/examples/helloworld-typescript) for the application structure.

Better Auth sessions are separate from [Egg sessions](../core/cookie-and-session.md). Read them with `auth.api.getSession()` as shown below; this integration does not populate `ctx.session` or the `ctx.user` extension provided by [Passport](./passport.md).

## Install and Configure Better Auth

Run the following commands from your application's root directory. This example uses SQLite; Better Auth also supports [other databases](https://www.better-auth.com/docs/concepts/database).

```bash
npm install better-auth better-sqlite3
npm install --save-dev @types/better-sqlite3
```

Set the environment variables in the shell where you will run the migration and start Egg:

```bash
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
export BETTER_AUTH_URL=http://localhost:7001
export EGG_KEYS="$(openssl rand -base64 32)"
```

`BETTER_AUTH_SECRET` must contain at least 32 characters. `EGG_KEYS` supplies Egg's cookie signing key; if your application already configures `keys`, keep that configuration instead. Persist these secrets in your deployment environment and use the same values across application workers and restarts.

Create a shared Better Auth instance outside Egg's automatically loaded `app/` directories:

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

The explicit `Database.Database` type lets TypeScript reference the database type when generating declaration files with Egg's TypeScript configuration.

Better Auth reads `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` from the environment. Create the authentication tables with its [CLI](https://www.better-auth.com/docs/concepts/cli):

```bash
npx auth@latest migrate --config ./lib/auth.ts
```

Keep `auth.sqlite` and any SQLite journal files out of version control.

## Configure Egg Middleware

Merge the following settings into your existing configuration, preserving your other options:

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

The Node.js handler reads the raw request body, so Egg's body parser must skip the authentication endpoints. Better Auth performs its own origin and CSRF checks on those endpoints, so Egg's CSRF middleware also skips them. Keep Egg's [CSRF protection](../core/security.md#prevention-of-security-threat-csrf) enabled for the rest of your application.

The expression matches `/api/auth` and its descendants without matching `/api/authors`. If you change Better Auth's `basePath`, update both ignore rules and the route below together.

## Mount the Handler and Read Sessions

Add the authentication handler and a protected `/api/me` route to your router:

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

`ctx.respond = false` lets the Node.js handler write the status, headers, cookies, and response body directly to `ctx.res`. The `/api/me` route uses normal Egg response handling and forwards the incoming headers to Better Auth so it can read the session cookie.

## Try the Integration

Start the application in the shell containing the environment variables:

```bash
npm run dev
```

From another terminal, check the authentication handler and the anonymous application route:

```bash
curl -i http://localhost:7001/api/auth/ok
curl -i http://localhost:7001/api/me
```

The first request returns `200` with `{"ok":true}`; the second returns `401`.

Create a user and save the session cookie:

```bash
curl -i -c cookies.txt http://localhost:7001/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:7001' \
  --data '{"name":"Alice","email":"alice@example.com","password":"replace-with-a-strong-password"}'
```

Use that cookie to access the protected route:

```bash
curl -i -b cookies.txt http://localhost:7001/api/me
```

The response now returns `200` and the user's details. Treat the local cookie jar as a credential and keep it out of version control.

## Deployment

Set `BETTER_AUTH_URL` to your application's public URL and use HTTPS in production. This tutorial uses the same origin for the browser and Egg. For a browser client on another origin, configure [Egg CORS](https://github.com/eggjs/cors) with an explicit allowed origin and credentials, add that origin to Better Auth's [`trustedOrigins`](https://www.better-auth.com/docs/reference/options#trustedorigins), and send requests with credentials from the client. Keep the [cookie attributes](https://www.better-auth.com/docs/concepts/cookies) appropriate for your deployment.
