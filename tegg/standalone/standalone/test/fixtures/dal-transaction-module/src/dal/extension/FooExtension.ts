import { type SqlMap } from '@eggjs/tegg/dal';

/**
 * Define Custom SQLs
 *
 * import { type SqlMap, SqlType } from '@eggjs/tegg/dal';
 *
 * export default {
 *   findByName: {
 *     type: SqlType.SELECT,
 *     sql: 'SELECT {{ allColumns }} from foo where name = {{ name }}'
 *   },
 * }
 */
export default {
  findByName: {
    type: 'SELECT',
    sql: 'SELECT {{ allColumns }} FROM egg_foo WHERE name = {{ name }}',
  },
} as Record<string, SqlMap>;
