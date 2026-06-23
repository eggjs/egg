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

  // Regression for bundle mode: an egg-compatible object injected WITHOUT an
  // explicit @EggQualifier. The Egg qualifier is added automatically by
  // EggQualifierProtoHook (a load-unit lifecycle hook). In a bundle the module
  // source files do not exist on disk, so that hook only sees this inject when
  // EggModuleLoader.loadModule loads the module classes from the manifest's
  // precomputed decoratedFiles. `logger` exists as both an app and a context
  // egg object, so without the auto qualifier the inject is ambiguous and DI
  // fails. See BundledAppBoot.test.ts.
  @Inject({ name: 'logger' })
  autoQualifierLogger: EggLogger;

  testInject(): { app: AppDefObj; ctx: AppDefObj } {
    return {
      app: this.appAppDefineObject,
      ctx: this.ctxAppDefineObject,
    };
  }

  getAutoQualifierLogger(): EggLogger {
    return this.autoQualifierLogger;
  }
}
