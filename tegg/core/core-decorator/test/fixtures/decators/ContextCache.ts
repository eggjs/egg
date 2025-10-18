import { AccessLevel } from '@eggjs/tegg-types';

import { ContextProto } from '../../../src/index.ts';
import { type ICache } from './ICache.ts';

@ContextProto({
  name: 'cache',
  accessLevel: AccessLevel.PUBLIC,
})
export default class ContextCache implements ICache {}
