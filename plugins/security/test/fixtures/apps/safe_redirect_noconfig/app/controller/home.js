exports.safeRedirect = async function () {
  const goto = this.query.goto;
  this.redirect(goto);
};

exports.unSafeRedirect = async function () {
  const goto = this.query.goto;
  this.unsafeRedirect(goto);
};
