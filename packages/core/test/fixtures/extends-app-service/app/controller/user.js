module.exports = async function () {
  this.body = {
    user: await this.service.user.get('123'),
  };
};
