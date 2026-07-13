import { RootProtoManager } from '@eggjs/controller-runtime';
import { InnerObjectProto } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';

// @eggjs/controller-runtime is a plain library (never scanned), so re-export its
// decorated protos here to let the `serviceWorker` eggModule scan register them.
// The egg host does the same in @eggjs/controller-plugin.
//
// RootProtoManager ships UN-decorated from the runtime (the egg host mounts it on
// `app` instead). The fetch host uses it as a DI inner object, so apply the
// inner-object proto here — PUBLIC because FetchEventHandler (a business proto)
// injects it.
InnerObjectProto({ accessLevel: AccessLevel.PUBLIC })(RootProtoManager);

export { RootProtoManager };
export { ControllerRegisterFactory, ControllerLoadUnitHook, ControllerPrototypeHook } from '@eggjs/controller-runtime';
