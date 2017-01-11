'use strict';

module.exports = function* () {
  if (this.cookies.get('remember')) {
    this.body = '<p>Remembered :). Click to <a href="/forget">forget</a>!.</p>';
    return;
  }

  this.body = `<form method="post" action="/remember"><p>Check to <label>
    <input type="checkbox" name="remember"/> remember me</label>
    <input type="submit" value="Submit"/>.</p></form>`;
};
