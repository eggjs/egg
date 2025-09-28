module.exports = agent => {
  const agentBeforeReadyTracers = [];
  const agentAfterReadyTracers = [];

  agentBeforeReadyTracers.push(agent.tracer);
  agentBeforeReadyTracers.push(agent.tracer);
  agentBeforeReadyTracers.push(agent.tracer);

  agent.agentBeforeReadyTracers = agentBeforeReadyTracers;
  agent.agentAfterReadyTracers = agentAfterReadyTracers;

  agent.ready(() => {
    agentAfterReadyTracers.push(agent.tracer);
    agentAfterReadyTracers.push(agent.tracer);
    agentAfterReadyTracers.push(agent.tracer);
  });
};
