module.exports = function (agent) {
  class ClusterStrategy extends agent.ScheduleStrategy {
    start() {
      this.interval = setInterval(() => {
        this.sendOne();
      }, this.schedule.interval);
    }
  }
  agent.schedule.use('cluster', ClusterStrategy);
};
