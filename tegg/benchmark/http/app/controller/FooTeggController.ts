import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';
import pkg from 'egg/package.json' with { type: 'json' };

@HTTPController()
export default class FooTeggController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello-tegg',
  })
  async hello(): Promise<string> {
    return `hello, tegg@${pkg.version}`;
  }
}
