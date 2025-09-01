import { debuglog } from 'node:util';
import { restore as mmRestore } from 'mm';
import { restoreMockAgent } from './mock_agent.js';
import { restore as clusterRestore } from './cluster.js';

const debug = debuglog('@eggjs/mock/lib/restore');

export async function restore() {
  // keep mm.restore execute in the current event loop
  mmRestore();
  await clusterRestore();
  await restoreMockAgent();
  debug('restore all');
}
