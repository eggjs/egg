'use strict';

// 启动日志，启动阶段还未加载 logger，统一使用这个。
const ConsoleLogger = require('egg-logger').EggConsoleLogger;
module.exports = new ConsoleLogger();
