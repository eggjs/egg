import { AccessLevel, ContextProto } from '@eggjs/tegg';

// No one deps it
// It should not be construct
@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class AppService {
  constructor() {
    (global as any).constructAppService = true;
  }
}
