'use strict';

exports.traceClient = function*() {
  this.body = {
    datetime: this.tracer.datetime,
    workId: this.tracer.workerId,
    sofaTraceId: this.tracer.traceId,
    sofaRpcId: this.tracer.rpcIdPlus,
    sofaRpcId2: this.tracer.rpcIdPlus,
    sofaCallerApp: this.tracer.callerApp,
    sofaCallerZone: this.tracer.callerZone,
  };
};

exports.traceServer = function*() {
  this.tracer.lastSofaRpcId = '0.1';
  this.body = {
    datetime: this.tracer.datetime,
    workId: this.tracer.workerId,
    sofaTraceId: this.tracer.traceId,
    sofaRpcId: this.tracer.rpcIdPlus,
    sofaRpcId2: this.tracer.rpcIdPlus,
    sofaCallerApp: this.tracer.callerApp,
    sofaCallerZone: this.tracer.callerZone,
  };
};
