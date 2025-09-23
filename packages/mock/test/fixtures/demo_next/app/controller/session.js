module.exports = async function () {
  this.session.save();
  this.body = this.session;
};
