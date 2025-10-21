import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';

@HTTPController()
export default class HomeController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async index() {
    return {
      message: 'hello, Egg.js!',
    };
  }
}
