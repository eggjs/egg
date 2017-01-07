'use strict';

const net = require('net');

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
    if (obj) {
      const keys = Object.keys(obj);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        target[key] = obj[key];
      }
    }
  }
  return target;
};

/**
 * 获取一个未被占用的本地端口
 * @param {Function} callback - 回调函数
 * @return {void}
 */
exports.getFreePort = function getFreePort(callback) {
  const server = net.createServer();
  server.unref();
  server.once('error', err => {
    callback(err);
  });
  server.listen(0, () => {
    const port = server.address().port;
    server.close(() => {
      callback(null, port);
    });
  });
};
