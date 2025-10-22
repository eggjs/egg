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
    const result = await this.httpClient.request('https://registry.npmmirror.com/egg/beta', {
      dataType: 'json',
    });
    return result.data;
  }
}
