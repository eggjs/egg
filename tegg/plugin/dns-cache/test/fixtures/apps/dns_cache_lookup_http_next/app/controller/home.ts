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
  this.set(result.headers);
  this.body = result.data;
}
