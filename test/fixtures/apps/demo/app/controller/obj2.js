module.exports = {
  async bar() {
    this.ctx.body = 'this is obj bar!';
  },

  subObj: {
    async hello() {
      this.ctx.body = 'this is subObj hello!';
    },

    subSubObj: {
      async hello() {
        this.ctx.body = 'this is subSubObj hello!';
      },
    },
  },
};
