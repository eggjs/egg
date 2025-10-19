import { Prototype, AccessLevel } from '@eggjs/core-decorator';

@Prototype({
  accessLevel: AccessLevel.PUBLIC,
})
export default class InvalidateService {}
