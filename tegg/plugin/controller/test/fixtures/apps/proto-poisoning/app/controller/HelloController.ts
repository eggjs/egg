import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody } from '@eggjs/tegg';

@HTTPController()
export class HelloController {
  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/hello-proto-poisoning',
  })
  async get(@HTTPBody() body: any) {
    // console.log(body, body.__proto__);
    const params1 = Object.assign({}, body);
    const params2 = {
      ...body,
    };
    return {
      params1,
      params2,
      body,
      'params1.boom': params1.boom,
      'params2.boom': params2.boom,
      'body.boom': body.boom,
    };
  }
}
