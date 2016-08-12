'use strict';

/**
 * 类似 Object.assign
 * @param {Object} target - assign 的目标对象
 * @param {Object | Array} objects - assign 的源，可以是一个 object 也可以是一个数组
 * @return {Object} - 返回 target
 */
exports.assign = function(target, objects) {
  if (!Array.isArray(objects)) {
    objects = [ objects ];
  }

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const keys = Object.keys(obj);
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      target[key] = obj[key];
    }
  }
  return target;
};
