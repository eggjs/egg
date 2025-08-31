module.exports = () => {
  return {
    async bar() {
      this.ctx.body = 'this is obj bar!';
    },

    async error() {
      aaa;
    },

    subObj: {
      async hello() {
        this.ctx.body = 'this is subObj hello!';
      },
    },
  };
};
