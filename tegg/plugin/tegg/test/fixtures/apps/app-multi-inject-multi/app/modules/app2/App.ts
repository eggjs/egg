import { Inject, SingletonProto } from '@eggjs/tegg';

import { Secret, SecretQualifier } from '../foo/Secret.ts';

@SingletonProto()
export class App2 {
  @Inject()
  @SecretQualifier('app2')
  secret: Secret;
}
