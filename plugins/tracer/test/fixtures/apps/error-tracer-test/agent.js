module.exports = agent => {
  const agentBeforeReadyTracers = [];
  const agentAfterReadyTracers = [];

  agent.agentBeforeReadyTracers = agentBeforeReadyTracers;
  agent.agentAfterReadyTracers = agentAfterReadyTracers;

  try {
    agentBeforeReadyTracers.push(agent.tracer);
    agentBeforeReadyTracers.push(agent.tracer);
    agentBeforeReadyTracers.push(agent.tracer);
  } catch (e) {
    agent.coreLogger.warn(e);
  }

  agent.ready(() => {
    try {
      agentAfterReadyTracers.push(agent.tracer);
      agentAfterReadyTracers.push(agent.tracer);
      agentAfterReadyTracers.push(agent.tracer);
    } catch (e) {
      agent.coreLogger.warn(e);
    }
  });
};
