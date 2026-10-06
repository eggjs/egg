#!/usr/bin/env -S node --import @oxc-node/core/register

import { execute } from '@oclif/core';

await execute({ development: true, dir: import.meta.url });
