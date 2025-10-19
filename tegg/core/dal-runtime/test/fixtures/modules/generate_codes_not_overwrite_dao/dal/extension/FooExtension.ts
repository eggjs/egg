import { SqlMap } from '@eggjs/dal-decorator';

/**
 * Define Custom SQLs
 *
 * import { SqlMap, SqlType } from '@eggjs/dal-decorator';
 *
 * export default {
 *   findByName: {
 *     type: SqlType.SELECT,
 *     sql: 'SELECT  from foo where name = '
 *   },
 * }
 */
export default {
  customFind: {
    type: 'SELECT',
    sql: `SELECT now()`,
  },
} as Record<string, SqlMap>;
