'use strict';

module.exports = app =>
  class UserService1 extends app.Service {
    get info() {
      const post = this.service.post.postInfo;
      return `user:${post}`;
    }
  };
