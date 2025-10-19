import { MultiInstanceProto, SingletonProto } from '../../../src/index.ts';

@SingletonProto()
export class ParentSingletonProto {}

export class ChildSingletonProto extends ParentSingletonProto {}

@MultiInstanceProto({
  objects: [],
})
export class ParentStaticMultiInstanceProto {}

export class ChildStaticMultiInstanceProto extends ParentStaticMultiInstanceProto {}

@MultiInstanceProto({
  getObjects: () => [],
})
export class ParentDynamicMultiInstanceProto {}

export class ChildDynamicMultiInstanceProto extends ParentDynamicMultiInstanceProto {}
