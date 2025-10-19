export class NunjucksConverter {
  /**
   * 将变量 HTML 转义的逻辑改为 MySQL 防注入转义
   *
   * eg:
   *
   *   output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "allColumns")
   *
   *   转换为
   *
   *   output += runtime.escapeSQL.call(this, "allColumns", runtime.contextOrFrameLookup(context,  frame, "allColumns")
   *
   * @param {String} code 转换前的代码
   * @return {String} 转换后的代码
   */
  static convertNormalVariableCode(code: string): string {
    return code.replace(
      /\Woutput\W*?\+=\W*?runtime\.suppressValue\(runtime\.contextOrFrameLookup\((.+?),(.*?),\W*?"(.+?)"\)/g,
      '\noutput += runtime.escapeSQL.call(this, "$3", runtime.contextOrFrameLookup($1, $2, "$3")'
    );
  }

  /**
   * 三目运算的 MySQL 防注入转义
   *
   * eg:
   *
   *   output += runtime.suppressValue((runtime.contextOrFrameLookup(context, frame, "$gmtCreate") !== \
   *     runtime.contextOrFrameLookup(context, frame, "undefined")?runtime.contextOrFrameLookup(context,\
   *     frame, "$gmtCreate"):"NOW()"), env.opts.autoescape);
   *
   *   转换为
   *
   *   output += runtime.suppressValue((runtime.contextOrFrameLookup(...) != ...) ?
   *     runtime.escapeSQL.call(this, "...", runtime.contextOrFrameLookup(...)) :
   *     ...)
   *
   * @param {String} code 转换前的代码
   * @return {String} 转换后的代码
   */
  static convertTernaryCode(code: string): string {
    // 先找到所有的 runtime.suppressValue((...?...:...), env...)
    const ternaryBefore =
      code.match(/\Woutput\W*?\+=\W*?runtime\.suppressValue\(\(.*\W*?\?\W*?.*?:.*\),\W*?env\.opts\.autoescape/g) || [];

    // 进行逐一处理
    const ternaryAfter = ternaryBefore.map(str => {
      return str
        .replace(
          /([?:])runtime\.contextOrFrameLookup\((.+?),(.*?),\W*?"(.+?)"\)/g,
          '$1runtime.escapeSQL.call(this, "$4", runtime.contextOrFrameLookup($2, $3, "$4"))'
        )
        .replace(/env.opts.autoescape$/g, 'false');
    });

    // 统一替换
    for (let i = 0; i < ternaryBefore.length; i++) {
      code = code.replace(ternaryBefore[i], ternaryAfter[i]);
    }

    return code;
  }

  /**
   * 对象的属性，如 `user.id` 防注入转义
   *
   * eg:
   *   output += runtime.suppressValue(runtime.memberLookup(\
   *     (runtime.contextOrFrameLookup(context, frame, "user")),"id"), env.opts.autoescape);
   *
   * 转换为
   *
   *   output += runtime.escapeSQL.call(this, "<...>", runtime.memberLookup(...), env.opts.autoescape);
   *
   * 由于 escapeSQL 中是根据 key 与预定义 block 匹配决定是否转义，而 memberLookup 的状态下总的 key 肯定不会匹配，
   * 所以找一个绝对不会匹配的 "<...>" 传入。事实上它可以是任意一个不会被匹配的字符串，比如说 ">_<" 等。
   *
   * @param {String} code 转换前的代码
   * @return {String} 转换后的代码
   */
  static convertNestedObjectCode(code: string): string {
    return code.replace(
      /\Woutput\W*?\+=\W*?runtime\.suppressValue\(runtime\.memberLookup\((.+?)\), env\.opts\.autoescape\)/g,
      '\noutput += runtime.escapeSQL.call(this, "<...>", runtime.memberLookup($1), env.opts.autoescape)'
    );
  }

  /**
   * For 中的 `t_xxx` 要被转义：
   *
   * eg:
   *   frame.set("...", t_...);
   *   ...
   *   output += runtime.suppressValue(t_.., env.opts.autoscape);
   *
   * 转换为
   *
   *   output += runtime.escapeSQL.call(this, "for.t_...", t_..., env.opts.autoescape);
   *
   * 由于 escapeSQL 中是根据 key 与预定义 block 匹配决定是否转义，而 memberLookup 的状态下总的 key 肯定不会匹配，
   * 所以找一个绝对不会匹配的 "for.t_..." 传入。事实上它可以是任意一个不会被匹配的字符串，比如说 ">_<" 等。
   *
   * @param {String} code 转换前的代码
   * @return {String} 转换后的代码
   */
  static convertValueInsideFor(code: string): string {
    return code.replace(
      /\Woutput\W*?\+=\W*?runtime\.suppressValue\((t_\d+), env\.opts\.autoescape\)/g,
      '\noutput += runtime.escapeSQL.call(this, "for.$1", $1, env.opts.autoescape)'
    );
  }
}
