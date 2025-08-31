'use strict';

// d(opt) <-- a --> b -> c(opt)
//          /      /
// e(opt) <-   <--
module.exports = {
  a: {
    enable: true,
    package: 'a',
  },
  b: {
    enable: true,
    package: 'b',
  },
  c: {
    enable: false,
    package: 'c',
  },
  d: {
    enable: false,
    package: 'd',
  },
  e: {
    enable: true,
    package: 'e',
  },
  f: {
    enable: true,
    package: 'f',
  },
};
