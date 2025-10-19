import { Inject, ModuleQualifier, SingletonProto } from '@eggjs/core-decorator';
import { Secret, SecretQualifier } from '../foo/Secret.js';

@SingletonProto()
export class App2 {
  @Inject()
  @ModuleQualifier('app2')
  @SecretQualifier('1')
  secret: Secret;
}
