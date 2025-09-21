#!/usr/bin/env node

import { createEgg } from './index.ts';

createEgg().catch(err => {
  console.error('create egg failed', err);
  process.exit(1);
});
