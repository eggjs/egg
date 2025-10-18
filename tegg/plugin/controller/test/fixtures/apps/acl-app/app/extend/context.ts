import { type EggContext } from '@eggjs/tegg';

export default {
  acl(this: EggContext, code?: string) {
    const authenticated = this.query.pass === 'true';
    let authorized = true;
    if (code && this.query.code !== code) {
      authorized = false;
    }
    if (!authenticated) {
      const error = new Error('unauthenticated') as any;
      error.data = {
        status: '401',
        redirectUrl: 'http://alipay.com/401',
      };
      throw error;
    }
    if (!authorized) {
      const error = new Error('unauthorized') as any;
      error.data = {
        status: '403',
        redirectUrl: 'http://alipay.com/403',
      };
      throw error;
    }
  },
};
