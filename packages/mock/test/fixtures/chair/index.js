const egg = require('egg');

async function startCluster(options) {
  // print for the testcase that will assert stdout
  console.log(options.eggPath);
  delete options.eggPath;
  await egg.startCluster(options);
}

exports.startCluster = startCluster;
exports.Application = egg.Application;
exports.Agent = egg.Agent;
