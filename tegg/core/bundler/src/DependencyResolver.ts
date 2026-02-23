import { ProtoNode } from '@eggjs/metadata';
import type { GlobalGraph } from '@eggjs/metadata';
import type { ProtoDescriptor } from '@eggjs/tegg-types';

/**
 * Resolves the full transitive dependency closure for a controller method.
 *
 * Given a controller proto and the set of property names accessed in a method,
 * returns all proto descriptors that must be imported for that method.
 */
export class DependencyResolver {
  constructor(private readonly globalGraph: GlobalGraph) {}

  /**
   * Resolve all dependencies (direct + transitive) for a controller method.
   *
   * @param controllerProto - ProtoDescriptor for the controller class
   * @param accessedProps - Set of `this.xxx` property names accessed in the method
   * @returns Ordered list of all required proto descriptors (not including the controller itself)
   */
  resolve(controllerProto: ProtoDescriptor, accessedProps: Set<string>): ProtoDescriptor[] {
    const deps: ProtoDescriptor[] = [];
    const visited = new Set<string>();
    const queue: ProtoDescriptor[] = [];

    // Seed with directly accessed inject objects from the controller
    for (const injectObj of controllerProto.injectObjects) {
      if (!accessedProps.has(injectObj.refName as string)) continue;

      const dep = this.globalGraph.findInjectProto(controllerProto, injectObj);
      if (!dep) continue;

      const depId = ProtoNode.createProtoId(dep);
      if (visited.has(depId)) continue;

      visited.add(depId);
      deps.push(dep);
      queue.push(dep);
    }

    // BFS to collect transitive dependencies
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      for (const injectObj of current.injectObjects) {
        const dep = this.globalGraph.findInjectProto(current, injectObj);
        if (!dep) continue;

        const depId = ProtoNode.createProtoId(dep);
        if (visited.has(depId)) continue;

        visited.add(depId);
        deps.push(dep);
        queue.push(dep);
      }
    }

    return deps;
  }
}
