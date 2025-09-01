import path from 'node:path';
import { readJSONSync } from 'utility';
import { Request, Test } from '@eggjs/supertest';
import { createServer } from './mock_http_server.js';
import { getSourceDirname } from './utils.js';

// patch from https://github.com/visionmedia/supertest/blob/199506d8dbfe0bb1434fc07c38cdcd1ab4c7c926/index.js#L19

let pkgVersion = '';

/**
 * Test against the given `app`,
 * returning a new `Test`.
 */
export class EggTestRequest extends Request {
  #app: any;

  constructor(app: any) {
    super(createServer(app));
    this.#app = app;
  }

  protected _testRequest(method: string, url: string): Test {
    // support pathFor(url)
    if (url[0] !== '/') {
      const realUrl = this.#app.router.pathFor(url);
      if (!realUrl) {
        throw new Error(`Can\'t find router:${url}, please check your \'app/router.js\'`);
      }
      url = realUrl;
    }
    const test = super._testRequest(method, url);
    if (!pkgVersion) {
      const pkgFile = path.join(getSourceDirname(), '../package.json');
      const pkg = readJSONSync(pkgFile);
      pkgVersion = pkg.version;
    }
    test.set('User-Agent', `@eggjs/mock/${pkgVersion} Node.js/${process.version}`);
    return test;
  }
}

export function request(app: any) {
  return new EggTestRequest(app);
}
