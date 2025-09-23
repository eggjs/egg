import { Inject, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery } from '@eggjs/tegg';
import { HelloService } from '@/module/foo';

@HTTPController({
  path: '/bar',
})
export class UserController {
  @Inject()
  private helloService: HelloService;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: 'user',
  })
  async user(@HTTPQuery({ name: 'userId' }) userId: string) {
    return await this.helloService.hello(userId);
  }
}
