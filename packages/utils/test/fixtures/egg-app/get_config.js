const { getConfig } = require('../../..');

(async () => {
  const configs = await getConfig(JSON.parse(process.argv[2]));
  console.log(process.argv[2]);
  console.log('get app configs %j', Object.keys(configs));
})();
