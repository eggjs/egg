import assert from 'node:assert';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { debuglog } from 'node:util';

import {
  EggLoadUnitType,
  type GraphNodeObj,
  InitTypeQualifierAttribute,
  type ObjectInitTypeLike,
} from '@eggjs/tegg-types';
import type {
  EggProtoImplClass,
  EggPrototype,
  EggPrototypeName,
  LoadUnit,
  LoadUnitLifecycleContext,
  QualifierInfo,
} from '@eggjs/tegg-types';
import { Graph, GraphNode, MapUtil } from '@eggjs/tegg-common-util';
import { IdenticalUtil, LifecycleUtil } from '@eggjs/tegg-lifecycle';
import { FrameworkErrorFormatter } from '@eggjs/errors';
import { PrototypeUtil, QualifierUtil } from '@eggjs/core-decorator';

import { EggPrototypeFactory, LoadUnitFactory, EggPrototypeCreatorFactory } from '../factory/index.ts';
import { ClassProtoDescriptor, GlobalGraph } from '../model/index.ts';
import { MultiPrototypeFound } from '../errors.ts';

const debug = debuglog('tegg/core/metadata/impl/ModuleLoadUnit');

let id = 0;

// TODO del ModuleGraph in next major version
class ProtoNode implements GraphNodeObj {
  readonly clazz: EggProtoImplClass;
  readonly name: EggPrototypeName;
  readonly id: string;
  readonly qualifiers: QualifierInfo[];
  readonly initType: ObjectInitTypeLike;
  private PrototypeUtil: any;

  constructor(
    clazz: EggProtoImplClass,
    objName: EggPrototypeName,
    initType: ObjectInitTypeLike,
    qualifiers: QualifierInfo[],
  ) {
    this.name = objName;
    this.id = '' + id++;
    this.clazz = clazz;
    this.qualifiers = qualifiers;
    this.initType = initType;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find((t) => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  toString(): string {
    return `${this.clazz.name}@${this.PrototypeUtil.getFilePath(this.clazz)}`;
  }
}

export class ModuleGraph {
  private graph: Graph<ProtoNode>;
  clazzList: EggProtoImplClass[];
  readonly unitPath: string;
  readonly name: string;

  constructor(clazzList: EggProtoImplClass[], unitPath: string, name: string) {
    this.clazzList = clazzList;
    this.graph = new Graph<ProtoNode>();
    this.unitPath = unitPath;
    this.name = name;
    debug(
      'ModuleGraph constructor on moduleName: %o, unitPath: %o, clazzList size: %o',
      this.name,
      this.unitPath,
      this.clazzList.length,
    );
  }

  private findInjectNode(
    objName: EggPrototypeName,
    qualifiers: QualifierInfo[],
    parentInitTye: ObjectInitTypeLike,
  ): GraphNode<ProtoNode> | undefined {
    let nodes = Array.from(this.graph.nodes.values())
      .filter((t) => t.val.name === objName)
      .filter((t) => t.val.verifyQualifiers(qualifiers));
    if (nodes.length === 0) {
      return undefined;
    }
    if (nodes.length === 1) {
      return nodes[0];
    }

    const initTypeQualifier = {
      attribute: InitTypeQualifierAttribute,
      value: parentInitTye,
    };

    nodes = nodes.filter((t) => t.val.verifyQualifiers([initTypeQualifier]));
    if (nodes.length === 1) {
      return nodes[0];
    }

    const temp: Map<EggProtoImplClass, GraphNode<ProtoNode>> = new Map();
    for (const node of nodes) {
      temp.set(node.val.clazz, node);
    }
    nodes = Array.from(temp.values());
    if (nodes.length === 1) {
      return nodes[0];
    }

    const result = nodes.map((node) => node.val.toString());
    throw FrameworkErrorFormatter.formatError(
      new MultiPrototypeFound(String(objName), qualifiers, JSON.stringify(result)),
    );
  }

  async build(): Promise<void> {
    const protoGraphNodes: GraphNode<ProtoNode>[] = [];
    for (const clazz of this.clazzList) {
      if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
        const properties = await PrototypeUtil.getMultiInstanceProperty(clazz, {
          unitPath: this.unitPath,
          moduleName: this.name,
        });
        if (properties) {
          const qualifiers = QualifierUtil.getProtoQualifiers(clazz);
          for (const obj of properties.objects || []) {
            const instanceQualifiers = [...qualifiers, ...obj.qualifiers];
            protoGraphNodes.push(
              new GraphNode(new ProtoNode(clazz, obj.name, properties.initType, instanceQualifiers)),
            );
          }
        }
      } else {
        const qualifiers = QualifierUtil.getProtoQualifiers(clazz);
        const property = PrototypeUtil.getProperty(clazz);
        if (property) {
          protoGraphNodes.push(new GraphNode(new ProtoNode(clazz, property.name, property.initType, qualifiers)));
        }
      }
    }
    for (const node of protoGraphNodes) {
      if (!this.graph.addVertex(node)) {
        throw new Error(`duplicate proto: ${node.val.id}`);
      }
    }
    for (const node of protoGraphNodes) {
      if (PrototypeUtil.isEggMultiInstancePrototype(node.val.clazz)) {
        const property = await PrototypeUtil.getMultiInstanceProperty(node.val.clazz, {
          moduleName: this.name,
          unitPath: this.unitPath,
        });
        for (const objectInfo of property?.objects || []) {
          const injectObjects = PrototypeUtil.getInjectObjects(node.val.clazz);
          for (const injectObject of injectObjects) {
            const qualifiers = [
              ...QualifierUtil.getProperQualifiers(node.val.clazz, injectObject.refName),
              ...(objectInfo.properQualifiers?.[injectObject.refName] ?? []),
            ];
            const injectNode = this.findInjectNode(injectObject.objName, qualifiers, node.val.initType);
            // If not found maybe in other module
            if (injectNode) {
              this.graph.addEdge(node, injectNode);
            }
          }
        }
      } else {
        const injectObjects = PrototypeUtil.getInjectObjects(node.val.clazz);
        for (const injectObject of injectObjects) {
          const qualifiers = QualifierUtil.getProperQualifiers(node.val.clazz, injectObject.refName);
          const injectNode = this.findInjectNode(injectObject.objName, qualifiers, node.val.initType);
          // If not found maybe in other module
          if (injectNode) {
            this.graph.addEdge(node, injectNode);
          }
        }
      }
    }
  }

  sort(): void {
    const loopPath = this.graph.loopPath();
    if (loopPath) {
      throw new Error('proto has recursive deps: ' + loopPath);
    }
    const clazzSet = new Set<EggProtoImplClass>();
    for (const clazz of this.graph.sort()) {
      clazzSet.add(clazz.val.clazz);
    }
    this.clazzList = Array.from(clazzSet);
  }
}

export class ModuleLoadUnit implements LoadUnit {
  // private loader: Loader;
  private protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();
  private protos: ClassProtoDescriptor[];
  private clazzList: EggProtoImplClass[];

  readonly id: string;
  readonly name: string;
  readonly unitPath: string;
  readonly type: EggLoadUnitType = EggLoadUnitType.MODULE;

  get globalGraph(): GlobalGraph {
    return GlobalGraph.instance!;
  }

  constructor(name: string, unitPath: string) {
    this.id = IdenticalUtil.createLoadUnitId(name);
    this.name = name;
    this.unitPath = unitPath;
    debug('ModuleLoadUnit constructor on moduleName: %o, unitPath: %o, id: %o', this.name, this.unitPath, this.id);
  }

  private doLoadClazz() {
    const protos = this.globalGraph.moduleProtoDescriptorMap.get(this.name);
    if (protos) {
      // TODO ModuleLoadUnit should support all proto descriptor
      this.protos = protos!.filter((t) => ClassProtoDescriptor.isClassProtoDescriptor(t));
      this.clazzList = this.protos.map((t) => t.clazz);
    } else {
      this.protos = [];
      this.clazzList = [];
    }
    debug(
      'doLoadClazz on moduleName: %o, protos size: %o, clazzList size: %o',
      this.name,
      this.protos.length,
      this.clazzList.length,
    );
  }

  private loadClazz() {
    if (!this.clazzList) {
      this.doLoadClazz();
    }
  }

  async preLoad(): Promise<void> {
    this.loadClazz();
    for (const protoClass of this.clazzList) {
      // TODO refactor lifecycle hook to ProtoDescriptor or EggPrototype
      // ModuleLoadUnit should not use clazz list
      const fnName = LifecycleUtil.getStaticLifecycleHook('preLoad', protoClass);
      if (fnName) {
        const lifecycleHook = Reflect.get(protoClass, fnName);
        if (typeof lifecycleHook === 'function') {
          await lifecycleHook();
        }
        // TODO(@fengmk2): lifecycleHook is not a function should throw error
      }
    }
  }

  async init(): Promise<void> {
    this.loadClazz();
    for (const protoDescriptor of this.protos) {
      const proto = await EggPrototypeCreatorFactory.createProtoByDescriptor(protoDescriptor, this);
      EggPrototypeFactory.instance.registerPrototype(proto, this);
    }
  }

  containPrototype(proto: EggPrototype): boolean {
    return !!this.protoMap.get(proto.name)?.find((t) => t === proto);
  }

  getEggPrototype(name: string, qualifiers: QualifierInfo[]): EggPrototype[] {
    const protos = this.protoMap.get(name);
    return protos?.filter((proto) => proto.verifyQualifiers(qualifiers)) || [];
  }

  registerEggPrototype(proto: EggPrototype): void {
    const protoList = MapUtil.getOrStore(this.protoMap, proto.name, []);
    protoList.push(proto);
  }

  deletePrototype(proto: EggPrototype): void {
    const protos = this.protoMap.get(proto.name);
    if (protos) {
      const index = protos.indexOf(proto);
      if (index !== -1) {
        protos.splice(index, 1);
      }
    }
  }

  async destroy(): Promise<void> {
    for (const namedProtoMap of this.protoMap.values()) {
      for (const proto of namedProtoMap.slice()) {
        EggPrototypeFactory.instance.deletePrototype(proto, this);
      }
    }
    this.protoMap.clear();
  }

  iterateEggPrototype(): IterableIterator<EggPrototype> {
    const protos: EggPrototype[] = Array.from(this.protoMap.values()).reduce((p, c) => {
      p = p.concat(c);
      return p;
    }, []);
    return protos.values();
  }

  static createModule(ctx: LoadUnitLifecycleContext): ModuleLoadUnit {
    const pkgPath = path.join(ctx.unitPath, 'package.json');
    const pkg: { eggModule?: { name: string } } = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    assert(pkg.eggModule, `module config not found in package ${pkgPath}`);
    const { name } = pkg.eggModule;
    return new ModuleLoadUnit(name, ctx.unitPath);
  }
}

LoadUnitFactory.registerLoadUnitCreator(EggLoadUnitType.MODULE, ModuleLoadUnit.createModule);
