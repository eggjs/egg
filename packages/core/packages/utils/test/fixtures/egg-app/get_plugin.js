const { getPlugins } = require('../../..');

(async () => {
  const plugins = await getPlugins(JSON.parse(process.argv[2]));
  console.log('get all plugins %j', Object.keys(plugins));
})();
