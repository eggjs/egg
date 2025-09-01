module.exports = async function() {
  const stream = await this.getFileStream();
  const fields = stream.fields;
  this.body = {
    fields,
    filename: stream.filename,
    user: this.user,
  };
};
