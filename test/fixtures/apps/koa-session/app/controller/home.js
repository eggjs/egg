
module.exports = function* () {
  if (!this.session.uid) {
    this.session.uid = this.query.uid;
  }
  this.body = {
    sessionUid: this.session.uid,
    uid: this.query.uid,
    userId: this.userId,
  };
};
