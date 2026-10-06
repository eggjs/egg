#!/usr/bin/env -S node --import @oxc-node/core/register --no-deprecation

import { execute } from '@oclif/core';

await execute({
  // development: true,
  dir: import.meta.url,
});
