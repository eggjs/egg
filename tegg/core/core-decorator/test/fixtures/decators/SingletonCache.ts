import { AccessLevel } from '@eggjs/tegg-types';

import { SingletonProto } from '../../../src/index.ts';
import { type ICache } from './ICache.ts';

@SingletonProto({
  name: 'cache',
  accessLevel: AccessLevel.PUBLIC,
})
export default class SingletonCache implements ICache {}
