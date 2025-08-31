exports.appOverrideChair = async function () {
  this.body = {
    value: this.ajax(),
  };
};

exports.pluginOverrideChair = async function () {
  this.body = {
    value: this.ip,
  };
};

exports.appOverridePlugin = async function () {
  this.body = {
    value: this.response.overridePlugin,
  };
};
