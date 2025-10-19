import { AccessLevel, ContextProto } from '@eggjs/tegg';

@ContextProto({ accessLevel: AccessLevel.PUBLIC })
export class FooService {
  type = 'context';
}
