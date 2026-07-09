import assert from 'node:assert';
import fs, { promises as fsPromise } from 'node:fs';
import path from 'node:path';

import type {
  InlineModuleReferenceConfig,
  ModuleConfig,
  ModuleReference,
  ModuleReferenceConfig,
  NpmModuleReferenceConfig,
  ReadModuleReferenceOptions,
} from '@eggjs/tegg-types';
import { TeggScope } from '@eggjs/tegg-types';
import { importResolve } from '@eggjs/utils';
import { extend } from 'extend2';
import globby from 'globby';
import { load as yamlLoad } from 'js-yaml';

import { FSUtil } from './FSUtil.ts';

export class ModuleReferenceConfigHelp {
  static isInlineModuleReference(
    moduleReference: ModuleReferenceConfig,
  ): moduleReference is InlineModuleReferenceConfig {
    return !!(moduleReference as InlineModuleReferenceConfig).path;
  }

  static isNpmModuleReference(moduleReference: ModuleReferenceConfig): moduleReference is NpmModuleReferenceConfig {
    return !!(moduleReference as NpmModuleReferenceConfig).package;
  }
}

const DEFAULT_READ_MODULE_REF_OPTS = {
  deep: 10,
};

const CONFIG_NAMES_SLOT = Symbol('tegg:common-util:moduleConfigNames');

export interface ResolvedModuleConfig {
  name: string;
  path: string;
  config: ModuleConfig;
}

export class ModuleConfigUtil {
  // Per-app/per-Runner: each standalone Runner (and app) has distinct config
  // names (env-based); a process-global static races across them (the standalone
  // "should work with env" ordering bug). Backed by TeggScope; with no active
  // scope it uses the single process-default bag (single-app / config-plugin boot).
  static get configNames(): string[] | undefined {
    return TeggScope.getOr(CONFIG_NAMES_SLOT, () => undefined, 'ModuleConfigUtil.configNames');
  }

  static set configNames(configNames: string[] | undefined) {
    TeggScope.set(CONFIG_NAMES_SLOT, configNames);
  }

  public static setConfigNames(configNames: string[] | undefined): void {
    ModuleConfigUtil.configNames = configNames;
  }

  public static readModuleReference(baseDir: string, options?: ReadModuleReferenceOptions): readonly ModuleReference[] {
    // 1. module.json exits use module.json as module reference
    // 1. module.json not exits scan baseDir get package.json to find modules
    const configDir = path.join(baseDir, 'config');
    const moduleJsonPath = path.join(configDir, 'module.json');
    if (fs.existsSync(moduleJsonPath)) {
      return this.readModuleReferenceFromModuleJson(configDir, moduleJsonPath, options?.cwd || baseDir);
    }
    return this.readModuleReferenceFromScan(baseDir, options);
  }

  private static readModuleReferenceFromModuleJson(
    configDir: string,
    moduleJsonPath: string,
    cwd?: string,
  ): readonly ModuleReference[] {
    const moduleJsonContent = fs.readFileSync(moduleJsonPath, 'utf8');
    const moduleJson: ModuleReferenceConfig[] = JSON.parse(moduleJsonContent);
    const moduleReferenceList: ModuleReference[] = [];
    for (const moduleReferenceConfig of moduleJson) {
      let moduleReference: ModuleReference;
      if (ModuleReferenceConfigHelp.isNpmModuleReference(moduleReferenceConfig)) {
        const options = cwd ? { paths: [cwd] } : {};
        // path.posix for windows keep path as foo/package.json
        const pkgJson = path.posix.join(moduleReferenceConfig.package, 'package.json');
        const file = importResolve(pkgJson, options);
        const modulePath = path.dirname(file);
        moduleReference = {
          path: modulePath,
          name: ModuleConfigUtil.readModuleNameSync(modulePath),
        };
      } else if (ModuleReferenceConfigHelp.isInlineModuleReference(moduleReferenceConfig)) {
        const modulePath = path.join(configDir, moduleReferenceConfig.path);
        moduleReference = {
          path: modulePath,
          name: ModuleConfigUtil.readModuleNameSync(modulePath),
        };
      } else {
        throw new Error('unknown type of module reference config: ' + JSON.stringify(moduleReferenceConfig));
      }
      moduleReferenceList.push(moduleReference);
    }
    return moduleReferenceList;
  }

  private static readModuleReferenceFromScan(
    baseDir: string,
    options?: ReadModuleReferenceOptions,
  ): readonly ModuleReference[] {
    const ref: ModuleReference[] = [];
    const realOptions: ReadModuleReferenceOptions = Object.assign({}, DEFAULT_READ_MODULE_REF_OPTS, options);
    const packagePaths = globby.sync(
      [
        '**/package.json',
        // not load node_modules
        '!**/node_modules',
        // not load files in .xxx/
        '!**/+(.*)/**',
        // not load coverage
        '!**/coverage',
        ...(realOptions.extraFilePattern || []),
      ],
      {
        cwd: baseDir,
        deep: realOptions.deep,
      },
    );
    const moduleDirSet = new Set<string>();
    for (const packagePath of packagePaths) {
      const absolutePkgPath = path.join(baseDir, packagePath);
      let realPkgPath;
      try {
        realPkgPath = fs.realpathSync(absolutePkgPath);
      } catch {
        continue;
      }

      const moduleDir = path.dirname(realPkgPath);

      // skip the symbolic link
      if (moduleDirSet.has(moduleDir)) {
        continue;
      }
      moduleDirSet.add(moduleDir);

      let name: string;
      try {
        name = this.readModuleNameSync(moduleDir);
      } catch {
        continue;
      }
      ref.push({
        path: moduleDir,
        name,
      });
    }
    const moduleReferences = this.readModuleFromNodeModules(baseDir);
    for (const moduleReference of moduleReferences) {
      const moduleBasePath = path.basename(moduleReference.path);
      moduleDirSet.forEach((modulePath) => {
        if (path.basename(modulePath) === moduleBasePath) {
          throw new Error('duplicate import of module reference: ' + moduleBasePath);
        }
      });
      ref.push({
        path: moduleReference.path,
        name: moduleReference.name,
      });
    }
    return ref;
  }

  public static readModuleFromNodeModules(baseDir: string): ModuleReference[] {
    const ref: ModuleReference[] = [];
    let pkgContent: string;
    try {
      pkgContent = fs.readFileSync(path.join(baseDir, 'package.json'), 'utf8');
    } catch {
      return [];
    }
    const pkg = JSON.parse(pkgContent);
    for (const dependencyKey of Object.keys(pkg.dependencies || {})) {
      let packageJsonPath: string;
      try {
        // https://nodejs.org/api/packages.html#package-entry-points
        // ignore cases where the package entry is exports but package.json is not exported
        packageJsonPath = importResolve(`${dependencyKey}/package.json`, {
          paths: [baseDir],
        });
      } catch {
        continue;
      }
      const absolutePkgPath = path.dirname(packageJsonPath);
      const realPkgPath = fs.realpathSync(absolutePkgPath);
      try {
        const name = this.readModuleNameSync(realPkgPath);
        ref.push({
          path: realPkgPath,
          name,
        });
      } catch {
        continue;
      }
    }
    return ref;
  }

  public static resolveModuleDir(moduleDir: string, baseDir?: string): string {
    if (path.isAbsolute(moduleDir)) {
      return moduleDir;
    }
    assert(baseDir, 'baseDir is required');
    return path.join(baseDir, 'config', moduleDir);
  }

  private static getModuleName(pkg: any) {
    assert(pkg.eggModule && pkg.eggModule.name, 'eggModule.name not found in package.json');
    return pkg.eggModule.name;
  }

  public static async readModuleName(baseDir: string, moduleDir: string): Promise<string> {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    const pkgContent = await fsPromise.readFile(path.join(moduleDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgContent);
    return ModuleConfigUtil.getModuleName(pkg);
  }

  public static readModuleNameSync(moduleDir: string, baseDir?: string): string {
    moduleDir = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    const pkgContent = fs.readFileSync(path.join(moduleDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgContent);
    return ModuleConfigUtil.getModuleName(pkg);
  }

  public static async loadModuleConfig(moduleDir: string, baseDir?: string, env?: string): Promise<ModuleConfig> {
    const modulePath = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    let configNames: string[];
    if (env) {
      configNames = ['module', `module.${env}`];
    } else {
      // assert(ModuleConfigUtil.configNames, 'should setConfigNames before load module config');
      configNames = ModuleConfigUtil.configNames || ['module'];
    }

    const target: ModuleConfig = {};
    for (const configName of configNames) {
      let config = await ModuleConfigUtil.#loadOne(modulePath, configName);
      // both module.yml and module.default.yml are ok for default config
      if (configName === 'module.default' && !config) {
        config = await ModuleConfigUtil.#loadOne(modulePath, 'module');
      }
      if (config) {
        extend(true, target, config);
      }
    }

    return target;
  }

  static async #loadOne(moduleDir: string, configName: string): Promise<ModuleConfig | undefined> {
    const yamlConfigPath = path.join(moduleDir, `${configName}.yml`);
    let config = await ModuleConfigUtil.#loadYaml(yamlConfigPath);
    if (!config) {
      const jsonConfigPath = path.join(moduleDir, `${configName}.json`);
      config = await ModuleConfigUtil.#loadJson(jsonConfigPath);
    }
    return config;
  }

  static async #loadJson(moduleJsonPath: string): Promise<ModuleConfig | undefined> {
    const moduleJsonPathExists = await FSUtil.fileExists(moduleJsonPath);
    if (!moduleJsonPathExists) {
      return;
    }
    const moduleJsonContent = await fsPromise.readFile(moduleJsonPath, 'utf8');
    const moduleJson = JSON.parse(moduleJsonContent);
    return moduleJson.config;
  }

  static async #loadYaml(moduleYamlPath: string): Promise<ModuleConfig | undefined> {
    const moduleYamlPathExists = await FSUtil.fileExists(moduleYamlPath);
    if (!moduleYamlPathExists) {
      return;
    }
    const moduleYamlContent = await fsPromise.readFile(moduleYamlPath, 'utf8');
    return yamlLoad(moduleYamlContent) as ModuleConfig;
  }

  public static loadModuleConfigSync(moduleDir: string, baseDir?: string, env?: string): ModuleConfig {
    const modulePath = ModuleConfigUtil.resolveModuleDir(moduleDir, baseDir);
    let configNames: string[];
    if (env) {
      configNames = ['module', `module.${env}`];
    } else {
      // assert(ModuleConfigUtil.configNames, 'should setConfigNames before load module config');
      configNames = ModuleConfigUtil.configNames || ['module'];
    }

    const target: ModuleConfig = {};
    for (const configName of configNames) {
      let config = ModuleConfigUtil.#loadOneSync(modulePath, configName);
      // both module.yml and module.default.yml are ok for default config
      if (configName === 'module.default' && !config) {
        config = ModuleConfigUtil.#loadOneSync(modulePath, 'module');
      }
      if (config) {
        extend(true, target, config);
      }
    }

    return target;
  }

  public static resolveModuleConfigTolerant(
    reference: ModuleReference,
    baseDir?: string,
    env?: string,
  ): ResolvedModuleConfig {
    if (!path.isAbsolute(reference.path)) {
      assert(baseDir, 'baseDir is required for relative module reference path');
    }
    const modulePath = path.isAbsolute(reference.path) ? reference.path : path.resolve(baseDir!, reference.path);

    if (!fs.existsSync(modulePath) && reference.name) {
      return {
        name: reference.name,
        path: modulePath,
        config: {},
      };
    }

    const name = ModuleConfigUtil.readModuleNameSync(modulePath);
    return {
      name,
      path: modulePath,
      config: ModuleConfigUtil.loadModuleConfigSync(modulePath, undefined, env),
    };
  }

  static #loadOneSync(moduleDir: string, configName: string): ModuleConfig | undefined {
    const yamlConfigPath = path.join(moduleDir, `${configName}.yml`);
    let config = ModuleConfigUtil.#loadYamlSync(yamlConfigPath);
    if (!config) {
      const jsonConfigPath = path.join(moduleDir, `${configName}.json`);
      config = ModuleConfigUtil.#loadJsonSync(jsonConfigPath);
    }
    return config;
  }

  static #loadJsonSync(moduleJsonPath: string): ModuleConfig | undefined {
    const moduleJsonPathExists = fs.existsSync(moduleJsonPath);
    if (!moduleJsonPathExists) {
      return;
    }
    const moduleJsonContent = fs.readFileSync(moduleJsonPath, 'utf8');
    const moduleJson = JSON.parse(moduleJsonContent);
    return moduleJson.config;
  }

  static #loadYamlSync(moduleYamlPath: string): ModuleConfig | undefined {
    const moduleYamlPathExists = fs.existsSync(moduleYamlPath);
    if (!moduleYamlPathExists) {
      return;
    }
    const moduleYamlContent = fs.readFileSync(moduleYamlPath, 'utf8');
    return yamlLoad(moduleYamlContent) as ModuleConfig;
  }

  /**
   * Deduplicate module references to avoid adding the same module multiple times.
   * @param moduleReferences array of module references
   * @return deduplicated module references
   */
  public static deduplicateModules(moduleReferences: readonly ModuleReference[]): readonly ModuleReference[] {
    const moduleMap = new Map<string, ModuleReference>();
    const nameMap = new Map<string, ModuleReference>();

    for (const moduleRef of moduleReferences) {
      const key = moduleRef.path;
      const existingRef = moduleMap.get(key);

      if (existingRef) {
        const existingOptional = existingRef.optional ?? false;
        const currentOptional = moduleRef.optional ?? false;

        if (!existingOptional && currentOptional) {
          continue;
        } else if (existingOptional && !currentOptional) {
          if (existingRef.name !== moduleRef.name) {
            const existingByName = nameMap.get(moduleRef.name);
            if (existingByName) {
              throw new Error(
                `Duplicate module name "${moduleRef.name}" found: existing at ${existingByName.path}, duplicate at ${moduleRef.path}`,
              );
            }
          }

          const newModuleRef = {
            ...moduleRef,
            optional: false,
          };
          moduleMap.set(key, newModuleRef);
          if (nameMap.get(existingRef.name) === existingRef) {
            nameMap.delete(existingRef.name);
          }
          nameMap.set(newModuleRef.name, newModuleRef);
          continue;
        }
        continue;
      }

      const existingByName = nameMap.get(moduleRef.name);
      if (existingByName) {
        throw new Error(
          `Duplicate module name "${moduleRef.name}" found: existing at ${existingByName.path}, duplicate at ${moduleRef.path}`,
        );
      }

      moduleMap.set(key, moduleRef);
      nameMap.set(moduleRef.name, moduleRef);
    }

    return Array.from(moduleMap.values());
  }
}
