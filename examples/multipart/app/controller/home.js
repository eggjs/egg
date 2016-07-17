'use strict';

module.exports = function* () {
  this.body = `<form method="post" enctype="multipart/form-data" action="/upload?_csrf=${this.csrf}">
    <p>Title: <input type="text" name="title" /></p>
    <p>Image: <input type="file" name="image" /></p>
    <p><input type="submit" value="Upload" /></p>
    </form>`;
};
