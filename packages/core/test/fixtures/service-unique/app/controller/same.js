module.exports = async function () {
  const ctx = this.service.ctx.get();
  this.body = String(ctx === this);
};
