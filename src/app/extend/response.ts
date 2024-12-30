import { Response as KoaResponse } from '@eggjs/core';

const REAL_STATUS = Symbol('response realStatus');

export default class Response extends KoaResponse {
  /**
   * Get or set a real status code.
   *
   * e.g.: Using 302 status redirect to the global error page
   * instead of show current 500 status page.
   * And access log should save 500 not 302,
   * then the `realStatus` can help us find out the real status code.
   * @member {Number} Response#realStatus
   * @return {Number} The status code to be set.
   */
  get realStatus(): number {
    if (this[REAL_STATUS]) {
      return this[REAL_STATUS] as number;
    }
    return this.status;
  }

  /**
   * Set a real status code.
   *
   * e.g.: Using 302 status redirect to the global error page
   * instead of show current 500 status page.
   * And access log should save 500 not 302,
   * then the `realStatus` can help us find out the real status code.
   * @member {Number} Response#realStatus
   * @param {Number} status The status code to be set.
   */
  set realStatus(status: number) {
    this[REAL_STATUS] = status;
  }
}
