import { AccessLevel, EggQualifier, EggType, Inject, SingletonProto } from '@eggjs/tegg';
import { EggLogger } from 'egg-logger';

interface AppDefObj {
  from: string;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class EggTypeService {
  @Inject({
    name: 'appDefineObject',
  })
  @EggQualifier(EggType.APP)
  appAppDefineObject: AppDefObj;

  @Inject({
    name: 'appDefineObject',
  })
  @EggQualifier(EggType.CONTEXT)
  ctxAppDefineObject: AppDefObj;

  @Inject()
  @EggQualifier(EggType.APP)
  logger: EggLogger;

  testInject() {
    return {
      app: this.appAppDefineObject,
      ctx: this.ctxAppDefineObject,
    };
  }
}
