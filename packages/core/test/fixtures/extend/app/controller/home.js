'use strict';

module.exports = async function () {
  const status = Number(this.query.status || 200);
  this.status = status;
  this.etag = '2.2.2.2';
  this.body = {
    returnAppContext: this.appContext,
    returnPluginbContext: this.pluginbContext,
    returnAppRequest: this.request.appRequest,
    returnPluginbRequest: this.request.pluginbRequest,
    returnAppResponse: this.response.appResponse,
    returnPluginbResponse: this.response.pluginbResponse,
    returnAppApplication: this.app.appApplication,
    returnPluginbApplication: this.app.pluginbApplication,
    status: this.status,
    etag: this.etag,
  };
};
