import nunjucks, { Template, type Environment } from 'nunjucks';
import sqlstring from 'sqlstring';

import { NunjucksConverter } from './NunjucksConverter.ts';
import { SqlUtil } from './SqlUtil.ts';

const compiler = (nunjucks as any).compiler;
const envs: Record<string, Environment> = {};

const ROOT_RENDER_FUNC = Symbol('rootRenderFunc');
const RUNTIME = Object.assign({}, nunjucks.runtime, {
  escapeSQL: function escapeSQL(this: any, key: string, value: unknown) {
    // 如果是预定义 block 则不转义
    if (this.env.globals[key]) return value;
    return sqlstring.escape(value, true, this.env.timezone);
  },
});

function _replaceCodeWithSQLFeature(source: string) {
  const funcs = [
    'convertNormalVariableCode', // 普通变量
    'convertTernaryCode', // 三目运算
    'convertNestedObjectCode', // 对象中的变量，如 `user.id`
    'convertValueInsideFor', // for 中的值需要转义
  ] as const;

  return funcs.reduce((source, func) => NunjucksConverter[func](source), source);
}

/**
 * compile the string into function
 * @see https://github.com/mozilla/nunjucks/blob/2fd547f/src/environment.js#L571-L592
 */
function _compile(this: any) {
  let source = compiler.compile(this.tmplStr, this.env.asyncFilters, this.env.extensionsList, this.path, this.env.opts);

  /**
   * 将一些 Nunjucks 的 HTML 转义的代码转换成 SQL 防注入的代码
   */
  source = _replaceCodeWithSQLFeature(source);

  // eslint-disable-next-line
  const props = new Function(source)();

  this.blocks = this._getBlocks(props);
  this[ROOT_RENDER_FUNC] = props.root;
  this.rootRenderFunc = function (env: Environment, context: any, frame: any, _runtime: any, cb: any) {
    /**
     * 1. 将 runtime 遗弃，用新的
     * 2. 移除 SQL 语句中多余空白符
     */
    return this[ROOT_RENDER_FUNC](env, context, frame, RUNTIME, function (err: Error | null, ret: string) {
      // istanbul ignore if
      if (err) return cb(err, ret);
      return cb(err, SqlUtil.minify(ret || ''));
    });
  };
  this.compiled = true;
}

export class NunjucksUtils {
  static createEnv(modelName: string) {
    if (envs[modelName]) return envs[modelName];

    const env = (envs[modelName] = nunjucks.configure({
      autoescape: false,
    }));

    return env;
  }

  static compile(modelName: string, sqlName: string, sql: string) {
    // istanbul ignore if
    if (!envs[modelName]) {
      throw new Error(`you should create an Environment for ${modelName} first.`);
    }

    const template = new Template(sql, envs[modelName], `egg-dal:MySQL:${modelName}:${sqlName}`, false);

    // 做一些 hack，使得支持 MySQL 的一些 Escape
    (template as any)._compile = _compile;
    (template as any).compile();

    return template;
  }
}
