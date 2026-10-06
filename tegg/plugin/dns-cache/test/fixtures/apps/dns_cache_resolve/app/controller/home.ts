export default async function () {
  let args;
  if (this.query.host) {
    args = args || {};
    args.headers = { host: this.query.host };
  }
  if (this.query.Host) {
    args = args || {};
    args.headers = { Host: this.query.Host };
  }
  const result = await this.curl(this.query.url, args);
  this.status = result.status;

  // Filter out conflicting headers
  const filteredHeaders = { ...result.headers };
  delete filteredHeaders['content-length'];
  delete filteredHeaders['transfer-encoding'];
  delete filteredHeaders['connection'];

  this.set(filteredHeaders);
  this.body = result.data;
}
