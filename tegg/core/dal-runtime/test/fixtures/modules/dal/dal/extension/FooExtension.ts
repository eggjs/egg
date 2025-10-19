import { SqlMap, SqlType } from '@eggjs/dal-decorator';

export default {
  findAll: {
    type: SqlType.SELECT,
    sql: 'SELECT {{ allColumns}} from egg_foo;',
  },
} as Record<string, SqlMap>;
