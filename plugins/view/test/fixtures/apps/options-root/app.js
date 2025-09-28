module.exports = app => {
  class View {
    async render(name, locals, options) {
      return {
        fullpath: name,
        root: options.root,
        name: options.name,
      };
    }

    async renderString(name) {
      return name;
    }
  }
  app.view.use('html', View);
};
