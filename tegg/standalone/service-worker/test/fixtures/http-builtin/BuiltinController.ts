import { HTTPMethodEnum, HTTPController, HTTPMethod, Inject, Logger } from '@eggjs/tegg';
import { HttpClient } from 'urllib';

@HTTPController()
export class BuiltinController {
  @Inject()
  private readonly logger: Logger;

  @Inject()
  private readonly httpclient: HttpClient;

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/log' })
  async log() {
    this.logger.info('hello from controller');
    return { ok: true };
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/httpclient' })
  async httpclientCheck() {
    // Just verify httpclient is injected and has request method
    return { hasRequest: typeof this.httpclient.request === 'function' };
  }
}
