import { HTTPMethodEnum, HTTPController, HTTPMethod, HTTPBody } from '@eggjs/tegg';

@HTTPController()
export class PostController {
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/echo' })
  async hello(@HTTPBody() data: object) {
    return {
      success: true,
      data,
    };
  }
}
