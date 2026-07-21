import { RootProtoManager } from '@eggjs/controller-runtime';
import { InnerObjectProto } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';

// Expose shared runtime protos through this scanned host package.
// The fetch host provides RootProtoManager as a public inner object.
InnerObjectProto({ accessLevel: AccessLevel.PUBLIC })(RootProtoManager);

export { RootProtoManager };
export {
  ControllerGraphHookRegistrar,
  ControllerRegisterFactory,
  ControllerLoadUnitHook,
  ControllerPrototypeHook,
} from '@eggjs/controller-runtime';
