import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
} from '@eggjs/tegg';

@HTTPController({
  path: '/users',
})
export class PriorityController {

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/*',
  })
  async lowPriority() {
    return 'low priority';
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/group',
  })
  async highPriority() {
    return 'high priority';
  }
}
