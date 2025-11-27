import assert from 'node:assert';
import util from 'node:util';

import { PrototypeUtil, QualifierUtil } from '@eggjs/core-decorator';
import { Graph, GraphNode, ModuleConfigUtil } from '@eggjs/tegg-common-util';
import type {
  EggProtoImplClass,
  EggPrototypeName,
  GraphNodeObj,
  ModuleReference,
  QualifierInfo,
} from '@eggjs/tegg-types';
import {
  AccessLevel,
  INIT_TYPE_TRY_ORDER,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
} from '@eggjs/tegg-types';

export interface InstanceClazzMeta {
  name: PropertyKey;
  qualifiers: QualifierInfo[];
  properQualifiers: Record<PropertyKey, QualifierInfo[]>;
  accessLevel: AccessLevel;
  instanceModule: GraphNode<ModuleNode>;
  ownerModule: GraphNode<ModuleNode>;
}

export type ClazzMetaMap = Record<EggPrototypeName, InstanceClazzMeta[]>;

function verifyQualifier(clazzQualifiers: QualifierInfo[], qualifier: QualifierInfo) {
  const selfQualifiers = clazzQualifiers.find((t) => t.attribute === qualifier.attribute);
  return selfQualifiers?.value === qualifier.value;
}

function verifyQualifiers(clazzQualifiers: QualifierInfo[], qualifiers: QualifierInfo[]) {
  for (const qualifier of qualifiers) {
    if (!verifyQualifier(clazzQualifiers, qualifier)) {
      return false;
    }
  }
  return true;
}

export class ClazzMap {
  private clazzMap: ClazzMetaMap;
  private graph: Graph<ModuleNode>;

  constructor(graph: Graph<ModuleNode>) {
    this.graph = graph;
  }

  async build(): Promise<void> {
    const graph = this.graph;
    /**
     * 1. iterate all module get all MultiInstanceClazz
     * 2. iterate MultiInstanceClazz and all module get object meta
     * 3. iterate object meta and build clazz map
     */
    const clazzMap: ClazzMetaMap = {};
    for (const ownerNode of graph.nodes.values()) {
      for (const clazz of ownerNode.val.getClazzList()) {
        const qualifiers = QualifierUtil.getProtoQualifiers(clazz);
        if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
          for (const instanceNode of graph.nodes.values()) {
            const property = await PrototypeUtil.getMultiInstanceProperty(clazz, {
              unitPath: instanceNode.val.moduleConfig.path,
              moduleName: instanceNode.val.moduleConfig.name,
            });
            assert(property, `multi instance property not found for ${clazz.name}`);
            for (const info of property.objects) {
              const instanceQualifiers = [...qualifiers, ...info.qualifiers];
              clazzMap[info.name] = clazzMap[info.name] || [];
              clazzMap[info.name].push({
                name: info.name,
                accessLevel: (await PrototypeUtil.getAccessLevel(clazz, {
                  unitPath: instanceNode.val.moduleConfig.path,
                  moduleName: instanceNode.val.moduleConfig.name,
                })) as AccessLevel,
                qualifiers: instanceQualifiers,
                properQualifiers: info.properQualifiers || {},
                instanceModule: instanceNode,
                ownerModule: ownerNode,
              });
            }
          }
        } else {
          const property = PrototypeUtil.getProperty(clazz);
          assert(property, `property not found for ${clazz.name}`);
          clazzMap[property.name] = clazzMap[property.name] || [];
          clazzMap[property.name].push({
            name: property.name,
            accessLevel: (await PrototypeUtil.getAccessLevel(clazz, {
              unitPath: ownerNode.val.moduleConfig.path,
              moduleName: ownerNode.val.moduleConfig.name,
            })) as AccessLevel,
            qualifiers,
            properQualifiers: {},
            ownerModule: ownerNode,
            instanceModule: ownerNode,
          });
        }
      }
    }
    this.clazzMap = clazzMap;
  }

  findDependencyModule(
    objName: EggPrototypeName,
    properQualifiers: QualifierInfo[],
    intoModule: GraphNode<ModuleNode>,
  ): GraphNode<ModuleNode>[] {
    const result: Set<GraphNode<ModuleNode>> = new Set();
    const objInfo = this.clazzMap[objName];
    if (!objInfo) {
      return [];
    }
    let mayObjs = objInfo.filter((obj) => {
      // 1. check accessLevel
      if (obj.instanceModule !== intoModule && obj.accessLevel === AccessLevel.PRIVATE) {
        return false;
      }
      // 2. check qualifier
      return verifyQualifiers(obj.qualifiers, properQualifiers);
    });

    // 3. auto set init type qualifier
    if (mayObjs.length > 1) {
      const initTypeQualifiers = INIT_TYPE_TRY_ORDER.map((type) => ({
        attribute: InitTypeQualifierAttribute,
        value: type,
      }));
      for (const initTypeQualifier of initTypeQualifiers) {
        const mayInitTypeObjs = mayObjs.filter((obj) => {
          return verifyQualifiers(obj.qualifiers, [...properQualifiers, initTypeQualifier]);
        });
        if (mayInitTypeObjs.length > 0) {
          mayObjs = mayInitTypeObjs;
        }
      }
    }

    // 4. auto set load unit name qualifier
    if (mayObjs.length > 1) {
      const moduleNameQualifiers = {
        attribute: LoadUnitNameQualifierAttribute,
        value: intoModule.val.name,
      };
      const mayLoadUnitNameObjs = mayObjs.filter((obj) => {
        return verifyQualifiers(obj.qualifiers, [...properQualifiers, moduleNameQualifiers]);
      });
      if (mayLoadUnitNameObjs.length > 0) {
        mayObjs = mayLoadUnitNameObjs;
      }
    }

    if (mayObjs.length > 1) {
      const message = util.format(
        'multi class found for %s@%o in module %j',
        objName,
        properQualifiers,
        mayObjs.map((t) => {
          return t.instanceModule.val.moduleConfig.path;
        }),
      );
      throw new Error(message);
    }

    for (const obj of mayObjs) {
      result.add(obj.instanceModule);
      // result.add(obj.ownerModule);
    }
    return Array.from(result);
  }
}

export class ModuleNode implements GraphNodeObj {
  readonly id: string;
  readonly name: string;
  readonly moduleConfig: ModuleReference;
  private readonly clazzList: EggProtoImplClass[];

  constructor(moduleConfig: ModuleReference) {
    this.moduleConfig = moduleConfig;
    this.id = moduleConfig.path;
    this.name = ModuleConfigUtil.readModuleNameSync(moduleConfig.path);
    this.clazzList = [];
  }

  async addClazz(clazz: EggProtoImplClass): Promise<void> {
    if (!this.clazzList.includes(clazz)) {
      this.clazzList.push(clazz);
    }
    if (!PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
      const initTypeQualifierAttributeValue = await PrototypeUtil.getInitType(clazz, {
        unitPath: this.moduleConfig.path,
        moduleName: this.moduleConfig.name,
      });
      const defaultQualifier = [
        {
          attribute: InitTypeQualifierAttribute,
          value: initTypeQualifierAttributeValue!,
        },
        {
          attribute: LoadUnitNameQualifierAttribute,
          value: this.name,
        },
      ];
      for (const qualifier of defaultQualifier) {
        QualifierUtil.addProtoQualifier(clazz, qualifier.attribute, qualifier.value);
      }
    }
  }

  toString() {
    return `${this.name}@${this.moduleConfig.path}`;
  }

  getClazzList(): readonly EggProtoImplClass[] {
    return this.clazzList;
  }
}

export class AppGraph {
  private graph: Graph<ModuleNode>;
  private clazzMap: ClazzMap;
  moduleConfigList: Array<ModuleReference>;

  constructor() {
    this.graph = new Graph<ModuleNode>();
  }

  addNode(moduleNode: ModuleNode): void {
    if (!this.graph.addVertex(new GraphNode(moduleNode))) {
      throw new Error(`duplicate module: ${moduleNode}`);
    }
  }

  getClazzList(): readonly EggProtoImplClass[] {
    const clazzSet = new Set<EggProtoImplClass>();
    for (const node of this.graph.nodes.values()) {
      for (const clazz of node.val.getClazzList()) {
        clazzSet.add(clazz);
      }
    }
    return Array.from(clazzSet);
  }

  async build(): Promise<void> {
    this.clazzMap = new ClazzMap(this.graph);
    await this.clazzMap.build();

    // 1. iterate all modules
    for (const node of this.graph.nodes.values()) {
      // 2. iterate all class
      for (const clazz of node.val.getClazzList()) {
        const injectObjects = PrototypeUtil.getInjectObjects(clazz);
        // 3. iterate all inject objects
        for (const injectObject of injectObjects) {
          if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
            for (const instanceNode of this.graph.nodes.values()) {
              const property = await PrototypeUtil.getMultiInstanceProperty(clazz, {
                unitPath: instanceNode.val.moduleConfig.path,
                moduleName: instanceNode.val.moduleConfig.name,
              });
              for (const info of property?.objects || []) {
                const properQualifiers = [
                  ...QualifierUtil.getProperQualifiers(clazz, injectObject.refName),
                  ...(info.properQualifiers?.[injectObject.refName] ?? []),
                ];
                // 4. find dependency module
                const dependencyModules = this.clazzMap.findDependencyModule(
                  injectObject.objName,
                  properQualifiers,
                  node,
                );
                for (const moduleNode of dependencyModules) {
                  // 5. add edge
                  if (instanceNode !== moduleNode) {
                    this.graph.addEdge(instanceNode, moduleNode);
                  }
                }
              }
            }
          } else {
            const properQualifiers = [...QualifierUtil.getProperQualifiers(clazz, injectObject.refName)];
            // 4. find dependency module
            const dependencyModules = this.clazzMap.findDependencyModule(injectObject.objName, properQualifiers, node);
            for (const moduleNode of dependencyModules) {
              // 5. add edge
              if (node !== moduleNode) {
                this.graph.addEdge(node, moduleNode);
              }
            }
          }
        }
      }
    }
  }

  sort(): void {
    const loopPath = this.graph.loopPath();
    if (loopPath) {
      throw new Error('module has recursive deps: ' + loopPath);
    }
    this.moduleConfigList = this.graph
      .sort()
      .filter((t) => {
        return t.val.moduleConfig.optional !== true || t.fromNodeMap.size > 0;
      })
      .map((t) => t.val.moduleConfig);
  }
}
