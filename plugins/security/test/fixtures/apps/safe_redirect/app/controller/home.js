exports.safeRedirect = async function () {
  const goto = this.query.goto;
  console.log('%j, %s', goto, goto);
  this.redirect(goto);
};

exports.unSafeRedirect = async function () {
  const goto = this.query.goto;
  this.unsafeRedirect(goto);
};
