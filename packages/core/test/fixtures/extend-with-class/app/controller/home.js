export default async function () {
  const status = Number(this.query.status || 200);
  this.status = status;
  this.etag = '2.2.2.2';
  this.body = {
    returnAppContext: this.appContext,
    returnAppRequest: this.request.appRequest,
    returnAppResponse: this.response.appResponse,
    returnAppApplication: this.app.appApplication,
    status: this.status,
    etag: this.etag,
  };
}
