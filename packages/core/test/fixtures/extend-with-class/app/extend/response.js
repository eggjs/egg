import { Response } from '../../../../../src/index.js';

export default class AppResponse extends Response {
  get appResponse() {
    return this.app.timing ? 'app response' : 'no app response';
  }

  set status(code) {
    this._explicitStatus = true;
    this.res.statusCode = code;
    this.res.statusMessage = 'http status code ' + code;
  }

  get etag() {
    return 'etag ok';
  }
}
