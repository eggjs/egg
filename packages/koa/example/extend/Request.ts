import { Request } from '../../src/index.ts';

const HOST = Symbol('request host');

export class CustomRequest extends Request {
  get host(): string {
    let host = this[HOST] as string;
    if (host) {
      return host;
    }

    if (this.app.proxy) {
      host = '127.0.0.1';
    }
    const rawHost = host || this.get('host');
    if (!rawHost) {
      this[HOST] = '';
      return '';
    }
    this[HOST] = rawHost.split(/,/)[0].trim();
    return host;
  }
}
