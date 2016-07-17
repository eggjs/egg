'use strict';

module.exports = app => {
  app.role.use('admin', function() {
    if (this.user && this.user.name === 'fengmk2') {
      return true;
    }
    return false;
  });
};
