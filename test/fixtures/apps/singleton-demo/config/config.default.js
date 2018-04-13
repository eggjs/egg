'use strict';

exports.dataService = {
  clients: {
    first: { foo1: 'bar1' },
    second: async () => {
      return { foo2: 'bar2' };
    },
  },

  default: {
    foo: 'bar',
  }
};

exports.dataServiceAsync = {
  clients: {
    first: { foo1: 'bar1' },
    second: async () => {
      return { foo2: 'bar2' };
    },
  },

  default: {
    foo: 'bar',
  }
};

exports.keys = 'test key';
