module.exports = async function () {
  if (this.query.set_ip) {
    this.ip = this.query.set_ip;
  }
  this.body = {
    ip: this.ip,
  };
};
