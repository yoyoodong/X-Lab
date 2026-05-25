const fs = require('node:fs');

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const data = readJson('data.json');

assert(data.summary, 'data.json missing summary');
assert(Array.isArray(data.members), 'data.json missing members[]');
assert(Array.isArray(data.projects), 'data.json missing projects[]');
assert(Array.isArray(data.daily), 'data.json missing daily[]');
assert(Array.isArray(data.future), 'data.json missing future[]');
assert(Array.isArray(data.memory), 'data.json missing memory[]');
assert(Array.isArray(data.typeSets), 'data.json missing typeSets[]');

for (const member of data.members) {
  assert(member.name, 'member missing name');
  assert(member.cn, `member ${member.name || '<unknown>'} missing cn`);
  assert(member.role, `member ${member.name} missing role`);
  assert(member.image, `member ${member.name} missing image`);
  assert(typeof member.progress === 'number', `member ${member.name} progress must be number`);
}

if (fs.existsSync('data/tasks.json')) {
  const tasks = readJson('data/tasks.json');
  assert(Array.isArray(tasks), 'data/tasks.json must be an array');
  for (const task of tasks) {
    assert(task.id, 'task missing id');
    assert(task.title, `task ${task.id} missing title`);
    assert(['feishu', 'project'].includes(task.source), `task ${task.id} source must be feishu or project`);
    if (task.route) {
      assert(['council', 'seven_samurai', 'skill', 'director_decide'].includes(task.route), `task ${task.id} route is invalid`);
      assert(task.routeLabel, `task ${task.id} missing routeLabel`);
    }
  }
}

if (fs.existsSync('data/agent-state.json')) {
  const state = readJson('data/agent-state.json');
  assert(state.agents && typeof state.agents === 'object', 'data/agent-state.json missing agents object');
  for (const [agentId, agent] of Object.entries(state.agents)) {
    assert(agent.agentId === agentId, `agent ${agentId} agentId mismatch`);
    assert(agent.role, `agent ${agentId} missing role`);
    assert(agent.status, `agent ${agentId} missing status`);
    assert('currentTaskId' in agent, `agent ${agentId} missing currentTaskId`);
    assert('deadlineAt' in agent, `agent ${agentId} missing deadlineAt`);
  }
}

if (fs.existsSync('data/handoffs.json')) {
  const handoffs = readJson('data/handoffs.json');
  assert(Array.isArray(handoffs), 'data/handoffs.json must be an array');
  for (const handoff of handoffs) {
    assert(handoff.id, 'handoff missing id');
    assert(handoff.taskId, `handoff ${handoff.id} missing taskId`);
    assert(handoff.from, `handoff ${handoff.id} missing from`);
    assert(handoff.status, `handoff ${handoff.id} missing status`);
    assert(handoff.artifact, `handoff ${handoff.id} missing artifact`);
  }
}

if (fs.existsSync('data/events.json')) {
  const events = readJson('data/events.json');
  assert(Array.isArray(events), 'data/events.json must be an array');
  for (const event of events) {
    assert(event.id, 'event missing id');
    assert(event.type, `event ${event.id} missing type`);
    assert(event.createdAt, `event ${event.id} missing createdAt`);
  }
}

if (fs.existsSync('data/council-sessions.json')) {
  const sessions = readJson('data/council-sessions.json');
  assert(Array.isArray(sessions), 'data/council-sessions.json must be an array');
  for (const session of sessions) {
    assert(session.id, 'council session missing id');
    assert(session.topic, `council session ${session.id} missing topic`);
    assert(session.decision, `council session ${session.id} missing decision`);
    assert(Array.isArray(session.advisors), `council session ${session.id} missing advisors[]`);
    assert(session.handoff && session.handoff.to, `council session ${session.id} missing handoff.to`);
  }
}

if (fs.existsSync('data/skill-runs.json')) {
  const runs = readJson('data/skill-runs.json');
  assert(Array.isArray(runs), 'data/skill-runs.json must be an array');
  for (const run of runs) {
    assert(run.id, 'skill run missing id');
    assert(run.taskId, `skill run ${run.id} missing taskId`);
    assert(run.requestedSkill, `skill run ${run.id} missing requestedSkill`);
    assert(run.status, `skill run ${run.id} missing status`);
  }
}

console.log('X_Lab data validation passed.');
