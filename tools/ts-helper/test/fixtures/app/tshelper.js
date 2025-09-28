const path = require('path');
module.exports = {
  framework: 'larva',
  generatorConfig: {
    notLegal: {
      path: 'app/custom',
      trigger: [ 'add', 'unlink' ],
      generator() {
        return null;
      },
    },
    custom: {
      path: 'app/custom',
      trigger: [ 'add', 'unlink' ],
      generator() {
        return {
          dist: path.resolve(__dirname, './typings/custom.d.ts'),
          content: 'export const a: string;',
        };
      },
    },
    custom2: {
      path: 'app/custom',
      trigger: [ 'add', 'unlink' ],
      generator: './custom',
    },
    casestyle: {
      path: 'app/casestyle',
      interface: 'schema',
      pattern: '**/*.schema.(ts|js)',
      ignore: '**/shouldIgnore/*.ts',
      caseStyle: filename => {
        const p1 = filename.split('.schema')[0];
        return p1.replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
      },
    },
    model: {
      path: 'app/model', // dir path
      generator: 'class', // generator name
      interface: 'IModel', // interface name
      declareTo: 'Context.model', // declare to this interface
      interfaceHandle: val => `ReturnType<typeof ${val}>`, // interfaceHandle
    },
  },
};
