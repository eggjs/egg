import { Request } from '../../../../../src/index.js';

export default class AppRequest extends Request {
  get appRequest() {
    return this.response.app.timing ? 'app request' : 'no app request';
  }
}
