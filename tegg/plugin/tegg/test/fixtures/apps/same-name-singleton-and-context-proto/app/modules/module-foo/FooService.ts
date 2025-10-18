import { AccessLevel, SingletonProto } from '@eggjs/tegg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class FooService {
  type = 'singleton';
}
