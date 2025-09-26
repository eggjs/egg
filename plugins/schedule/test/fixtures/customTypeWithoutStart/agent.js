module.exports = function (agent) {
  class ClusterStrategy extends agent.ScheduleStrategy {
    constructor(...args) {
      super(...args);
      this.interval = setInterval(() => {
        this.sendOne();
      }, this.schedule.interval);
    }
  }
  agent.schedule.use('cluster', ClusterStrategy);
};
