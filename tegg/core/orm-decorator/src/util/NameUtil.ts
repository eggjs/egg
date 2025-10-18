import _ from 'lodash';
import pluralize from 'pluralize';

export class NameUtil {
  /**
   * get table name
   * StudentScore -> student_scores
   */
  static getTableName(modelName: string): string {
    const modelNames = pluralize(modelName);
    return _.snakeCase(modelNames);
  }

  /**
   * get attribute name
   * userName -> user_name
   */
  static getAttributeName(propertyName: string): string {
    return _.snakeCase(propertyName);
  }

  /**
   * [ 'user_name' ], unique
   * uk_user_name
   *
   * [ 'user_name', 'gender' ]
   * idx_user_name_gender
   */
  static getIndexName(fields: string[], options?: { unique?: boolean }): string {
    const prefix = options?.unique ? 'uk_' : 'idx_';
    const names = fields.join('_');
    return prefix + names;
  }
}
