const { buildRuntimeSnapshot, findRuntimeAlerts, recordEvent } = require('./agent-runtime');

function summarizeAgents(snapshot) {
  return Object.values(snapshot.agentState.agents || {}).map((agent) => ({
    agentId: agent.agentId,
    role: agent.role,
    status: agent.status,
    taskId: agent.currentTaskId,
    deadlineAt: agent.deadlineAt || null,
    waitingFor: agent.waitingFor || null,
    blockedReason: agent.blockedReason || null
  }));
}

function main() {
  const snapshot = buildRuntimeSnapshot();
  const alerts = findRuntimeAlerts(snapshot);
  const agents = summarizeAgents(snapshot);

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    agents,
    alertCount: alerts.length,
    alerts
  }, null, 2));

  if (alerts.length) {
    recordEvent('runtime_alerts_detected', {
      alertCount: alerts.length,
      alerts
    });
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
