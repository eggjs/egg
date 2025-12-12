import { Inject, HTTPController, HTTPMethod, HTTPMethodEnum, type Logger } from 'egg';

@HTTPController({
  path: '/',
})
export class HomeController {
  @Inject()
  private logger: Logger;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/',
  })
  async index() {
    this.logger.info('hello egg logger');
    return 'hello egg';
  }
}
