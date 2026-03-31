import { SingletonProto, Inject, EggAppConfig, HttpClient, AccessLevel } from 'egg';

import { HelloService } from './HelloService.ts';
import { WorldService } from './WorldService.ts';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Foo {
  @Inject()
  config: EggAppConfig;

  @Inject()
  httpClient: HttpClient;

  @Inject()
  helloService: HelloService;

  @Inject({ name: 'helloService' })
  aliasHelloService: HelloService; // equals to helloService

  @Inject({ name: 'worldInterface' })
  worldService: WorldService;

  async bar() {
    console.log('current env is %s', this.config.env);
    return `${await this.helloService.hello()}, ${await this.worldService.world()}`;
    // return 'hello, bar!';
  }

  async fetch() {
    // use official registry in CI (GitHub Actions) to avoid npmmirror flakiness
    const registry = process.env.GITHUB_ACTIONS ? 'https://registry.npmjs.com' : 'https://registry.npmmirror.com';
    const result = await this.httpClient.request(`${registry}/egg/beta`, {
      dataType: 'json',
    });
    return result.data;
  }
}
