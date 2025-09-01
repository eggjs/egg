import { Request } from '../../../../../src/index.ts';

export default class AppRequest extends Request {
  get appRequest() {
    return this.response.app.timing ? 'app request' : 'no app request';
  }
}
