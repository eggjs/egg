'use strict';

module.exports = app => {
  return {
    echo() {
      return `echo ${app.config.pkgName}`;
    },
  };
};
