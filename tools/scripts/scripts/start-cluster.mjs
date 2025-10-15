import { debuglog } from "node:util";

import { importModule } from "@eggjs/utils";

const debug = debuglog("egg/scripts/start-cluster/esm");

async function main() {
  debug("argv: %o", process.argv);
  const options = JSON.parse(process.argv[2]);
  debug("start cluster options: %o", options);
  const { startCluster } = await importModule(options.framework);
  await startCluster(options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
