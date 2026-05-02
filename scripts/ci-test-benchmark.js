#!/usr/bin/env node

import { main } from './ci-test-benchmark/index.js';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
