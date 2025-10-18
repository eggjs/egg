/**
 * This keyword allows a string to be modified during validation.
 * This keyword applies only to strings. If the data is not a string, the transform keyword is ignored.
 * @see https://github.com/ajv-validator/ajv-keywords?tab=readme-ov-file#transform
 */
export enum TransformEnum {
  /** remove whitespace from start and end */
  trim = 'trim',
  /** remove whitespace from start */
  trimStart = 'trimStart',
  /**
   * @alias trimStart
   */
  trimLeft = 'trimLeft',
  /** remove whitespace from end */
  trimEnd = 'trimEnd',
  /**
   * @alias trimEnd
   */
  trimRight = 'trimRight',
  /** convert to lower case */
  toLowerCase = 'toLowerCase',
  /** convert to upper case */
  toUpperCase = 'toUpperCase',
  /**
   * change string case to be equal to one of `enum` values in the schema
   *
   * **NOTE**: requires that all allowed values are unique when case insensitive
   * ```ts
   * const schema = {
   *   type: "array",
   *   items: {
   *     type: "string",
   *     transform: ["trim", Transform.toEnumCase],
   *     enum: ["pH"],
   *   },
   * };
   *
   * const data = ["ph", " Ph", "PH", "pH "];
   * ajv.validate(schema, data);
   * console.log(data) // ['pH','pH','pH','pH'];
   * ```
   */
  toEnumCase = 'toEnumCase',
}
