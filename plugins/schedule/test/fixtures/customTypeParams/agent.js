'use strict';

module.exports = function (agent) {
  class ClusterStrategy extends agent.ScheduleStrategy {
    start() {
      this.interval = setInterval(() => {
        this.sendOne({ foo: 'worker' });
      }, this.schedule.interval);
    }
  }
  agent.schedule.use('cluster', ClusterStrategy);

  class ClusterAllStrategy extends agent.ScheduleStrategy {
    start() {
      this.interval = setInterval(() => {
        this.sendAll({ foo: 'all' });
      }, this.schedule.interval);
    }
  }
  agent.schedule.use('cluster-all', ClusterAllStrategy);
};
