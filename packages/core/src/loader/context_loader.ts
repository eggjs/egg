import assert from 'node:assert';
import { isClass, isPrimitive } from 'is-type-of';
import { FileLoader, EXPORTS, type FileLoaderOptions } from './file_loader.js';
import type { Context } from '../egg.js';

const CLASS_LOADER = Symbol('classLoader');

export interface ClassLoaderOptions {
  ctx: Context;
  properties: any;
}

export class ClassLoader {
  readonly _cache = new Map();
  _ctx: Context;

  constructor(options: ClassLoaderOptions) {
    assert(options.ctx, 'options.ctx is required');
    const properties = options.properties;
    this._ctx = options.ctx;

    for (const property in properties) {
      this.#defineProperty(property, properties[property]);
    }
  }

  #defineProperty(property: string, values: any) {
    Object.defineProperty(this, property, {
      get() {
        let instance: any = this._cache.get(property);
        if (!instance) {
          instance = getInstance(values, this._ctx);
          this._cache.set(property, instance);
        }
        return instance;
      },
    });
  }
}

export interface ContextLoaderOptions
  extends Omit<FileLoaderOptions, 'target'> {
  /** required inject */
  inject: Record<string, any>;
  /** property name defined to target */
  property: string | symbol;
  /** determine the field name of inject object. */
  fieldClass?: string;
}

/**
 * Same as {@link FileLoader}, but it will attach file to `inject[fieldClass]`.
 * The exports will be lazy loaded, such as `ctx.group.repository`.
 * @augments FileLoader
 * @since 1.0.0
 */
export class ContextLoader extends FileLoader {
  readonly #inject: Record<string, any>;
  /**
   * @class
   * @param {Object} options - options same as {@link FileLoader}
   * @param {String} options.fieldClass - determine the field name of inject object.
   */
  constructor(options: ContextLoaderOptions) {
    assert(options.property, 'options.property is required');
    assert(options.inject, 'options.inject is required');
    const target = {};
    if (options.fieldClass) {
      options.inject[options.fieldClass] = target;
    }
    super({
      ...options,
      target,
    });
    this.#inject = this.options.inject as Record<string, any>;

    const app = this.#inject;
    const property = options.property;
    // define ctx.service
    Object.defineProperty(app.context, property, {
      get() {
        // oxlint-disable-next-line unicorn/no-this-assignment, typescript/no-this-alias
        const ctx = this;
        // distinguish property cache,
        // cache's lifecycle is the same with this context instance
        // e.x. ctx.service1 and ctx.service2 have different cache
        if (!ctx[CLASS_LOADER]) {
          ctx[CLASS_LOADER] = new Map();
        }
        const classLoader: Map<string | symbol, ClassLoader> =
          ctx[CLASS_LOADER];
        let instance = classLoader.get(property);
        if (!instance) {
          instance = getInstance(target, ctx);
          classLoader.set(property, instance as ClassLoader);
        }
        return instance;
      },
    });
  }
}

function getInstance(values: any, ctx: Context) {
  // it's a directory when it has no exports
  // then use ClassLoader
  const Class = values[EXPORTS] ? values : null;
  let instance;
  if (Class) {
    if (isClass(Class)) {
      instance = new Class(ctx);
    } else {
      // it's just an object
      instance = Class;
    }
    // Can't set property to primitive, so check again
    // e.x. module.exports = 1;
  } else if (isPrimitive(values)) {
    instance = values;
  } else {
    instance = new ClassLoader({ ctx, properties: values });
  }
  return instance;
}
