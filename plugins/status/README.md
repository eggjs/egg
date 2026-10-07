# @eggjs/status

Health check middleware for Egg applications, migrated from [egg-status](https://github.com/eggjs/egg-status).

This package supports Egg 4 and Node.js >= 22.18.0. Applications on Egg 3 can continue to use `egg-status`.

## Install

```bash
npm i @eggjs/status
```

## Usage

Enable the plugin in `config/plugin.ts`:

```ts
import statusPlugin from '@eggjs/status';

export default {
  ...statusPlugin(),
};
```

The package declaration is also supported:

```ts
export default {
  status: {
    enable: true,
    package: '@eggjs/status',
  },
};
```

The middleware runs immediately after `meta`. Requests to `/egg.status` return HTTP `200` with an `online` keyword when `${baseDir}/egg.status` exists. Otherwise, they return HTTP `404` with an `offline` keyword. The response also includes the application name, middleware start time, and current time. Other paths continue to the application's middleware and routes.

## Configuration

The defaults are:

```ts
// config/config.default.ts
import path from 'node:path';
import type { EggAppInfo, PartialEggConfig } from 'egg';
import '@eggjs/status';

export default (appInfo: EggAppInfo): PartialEggConfig => ({
  status: {
    availableResponseKeyword: 'online',
    unavailableResponseKeyword: 'offline',
    unavailableResponseStatus: 404,
    checkStatusURLs: ['/egg.status'],
    checkStatusFiles: [path.join(appInfo.baseDir, 'egg.status')],
  },
});
```

`checkStatusURLs` matches exact request paths; query strings do not affect matching. The application is available when **any** configured status file is accessible. File contents are ignored. If no file is accessible, including when the file list is empty, the middleware returns the configured unavailable response. Files are checked on each request, so creating or removing a file changes the response without a restart.

The package exports `StatusConfig` for TypeScript consumers.

## Deployment

Use [@eggjs/scripts](../../tools/scripts/README.md) to start and stop the application:

```bash
npm i @eggjs/scripts
```

On a POSIX system, create `egg.status` after startup and remove it before shutdown:

```json
{
  "scripts": {
    "start": "egg-scripts start --daemon && touch egg.status",
    "stop": "rm -f egg.status && sleep 15 && egg-scripts stop"
  }
}
```

Configure the load balancer to check `/egg.status` and accept HTTP `200`. Adjust the shutdown delay to allow the load balancer to stop sending traffic before the application exits.

## Migration from egg-status

Replace the `egg-status` dependency with `@eggjs/status` and update `config/plugin.ts` as shown above. The `status` configuration keys, default health path, status file, and response format are unchanged.

## Contributing

See the [contributing guide](../../CONTRIBUTING.md). Report bugs and suggestions in the [issue tracker](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
