export default () => {
  return {
    tegg: {
      readModuleOptions: {
        extraFilePattern: ['!**/dist'] as string[],
      },
    },
  };
};
