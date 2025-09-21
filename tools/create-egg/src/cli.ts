#!/usr/bin/env node

import { init } from './index.ts';

init().catch(err => {
  console.error('create egg failed', err);
  process.exit(1);
});
