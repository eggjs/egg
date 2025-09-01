import { debuglog } from 'node:util';

import { restore as mmRestore } from 'mm';

import { restoreMockAgent } from './mock_agent.ts';
import { restore as clusterRestore } from './cluster.ts';

const debug = debuglog('egg/mock/lib/restore');

export async function restore() {
  // keep mm.restore execute in the current event loop
  mmRestore();
  await clusterRestore();
  await restoreMockAgent();
  debug('restore all');
}
