import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
} from '@eggjs/tegg';

@HTTPController()
export class ViewController {

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/*',
  })
  async get() {
    return 'hello, view';
  }
}
