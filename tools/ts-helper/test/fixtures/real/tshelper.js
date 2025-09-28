module.exports = {
  generatorConfig: {
    model: {
      path: 'app/model', // dir path
      generator: 'class', // generator name
      interface: 'IModel', // interface name
      declareTo: 'Application.model', // declare to this interface
      interfaceHandle: val => `ReturnType<typeof ${val}>`, // interfaceHandle
    },

    custom: {
      path: 'app/custom', // dir path
      generator: 'auto', // generator name
      declareTo: 'Application.custom', // declare to this interface
    },
  },
};
