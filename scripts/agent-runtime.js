const fs = require('node:fs');
const path = require('node:path');

const AGENT_STATE_PATH = 'data/agent-state.json';
const HANDOFFS_PATH = 'data/handoffs.json';
const EVENTS_PATH = 'data/events.json';
const DEFAULT_AGENT_TIMEOUT_MINUTES = 60;

function now() {
  return new Date().toISOString();
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readAgentState() {
  return readJson(AGENT_STATE_PATH, { agents: {}, updatedAt: null });
}

function writeAgentState(state) {
  state.updatedAt = now();
  writeJson(AGENT_STATE_PATH, state);
}

function ensureAgents(roleSequence) {
  const state = readAgentState();

  for (const role of roleSequence) {
    if (!state.agents[role.id]) {
      state.agents[role.id] = {
        agentId: role.id,
        role: role.role,
        english: role.english,
        status: 'idle',
        currentTaskId: null,
        lastSeenAt: null,
        lastOutput: null,
        waitingFor: null,
        blockedReason: null,
        capabilities: []
      };
    } else {
      state.agents[role.id].role = role.role;
      state.agents[role.id].english = role.english;
    }
  }

  writeAgentState(state);
  return state;
}

function updateAgent(agentId, patch) {
  const state = readAgentState();
  if (!state.agents[agentId]) {
    state.agents[agentId] = { agentId };
  }

  state.agents[agentId] = {
    ...state.agents[agentId],
    ...patch,
    lastSeenAt: now()
  };

  writeAgentState(state);
  return state.agents[agentId];
}

function markAgentWorking(agentId, taskId, timeoutMinutes = DEFAULT_AGENT_TIMEOUT_MINUTES) {
  return updateAgent(agentId, {
    status: 'working',
    currentTaskId: taskId,
    assignedAt: now(),
    deadlineAt: minutesFromNow(timeoutMinutes),
    waitingFor: null,
    blockedReason: null
  });
}

function markAgentIdle(agentId) {
  return updateAgent(agentId, {
    status: 'idle',
    currentTaskId: null,
    assignedAt: null,
    deadlineAt: null,
    waitingFor: null,
    blockedReason: null
  });
}

function appendJsonItem(filePath, item) {
  const items = readJson(filePath, []);
  items.push(item);
  writeJson(filePath, items);
  return item;
}

function recordEvent(type, payload) {
  return appendJsonItem(EVENTS_PATH, {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ...payload,
    type,
    createdAt: now()
  });
}

function createHandoff({ task, fromRole, toRole, output, summary, openQuestions, status = 'handoff_ready' }) {
  return appendJsonItem(HANDOFFS_PATH, {
    id: `${task.id}-${fromRole.id}-${toRole?.id || 'done'}-${Date.now()}`,
    taskId: task.id,
    taskTitle: task.title,
    from: fromRole.id,
    fromRole: fromRole.role,
    to: toRole?.id || null,
    toRole: toRole?.role || null,
    status,
    artifact: output,
    summary,
    openQuestions,
    createdAt: now()
  });
}

function detectOpenQuestions(content) {
  const questions = [];
  const patterns = [
    /(?:需要补充|待补充)(?:的资料|资料|信息|内容)?[：:\s]*(.+)/g,
    /待确认(?:事项|信息|内容)?[：:\s]*(.+)/g,
    /当前资料未提供/g,
    /无法确认/g
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      questions.push(match[1] ? match[1].trim().slice(0, 120) : match[0]);
    }
  }

  return [...new Set(questions)].slice(0, 5);
}

function detectConflict(outputs) {
  const joined = outputs.map((item) => item.content).join('\n');
  const hasPublishIntent = /建议.*(发布|推进|采用|值得|可以做)/.test(joined);
  const hasStopSignal = /(不建议|暂停|暂缓|事实不足|风险较高|不要发布|不能发布)/.test(joined);

  if (!hasPublishIntent || !hasStopSignal) {
    return null;
  }

  return {
    type: 'publish_risk_conflict',
    summary: '角色产出同时出现推进发布和暂停/事实不足信号，需要虾老大仲裁。',
    arbiter: 'director'
  };
}

function hasReviewBlockers({ conflict, outputs }) {
  return Boolean(conflict) || outputs.some((item) => item.openQuestions?.length);
}

function buildRuntimeSnapshot() {
  return {
    agentState: readJson(AGENT_STATE_PATH, { agents: {}, updatedAt: null }),
    handoffs: readJson(HANDOFFS_PATH, []),
    events: readJson(EVENTS_PATH, [])
  };
}

function findRuntimeAlerts(snapshot = buildRuntimeSnapshot(), currentTime = new Date()) {
  const alerts = [];
  const agents = snapshot.agentState.agents || {};

  for (const agent of Object.values(agents)) {
    if (agent.deadlineAt && ['working', 'waiting_input'].includes(agent.status)) {
      const deadline = new Date(agent.deadlineAt);
      if (!Number.isNaN(deadline.valueOf()) && deadline < currentTime) {
        alerts.push({
          type: 'agent_timeout',
          severity: agent.status === 'working' ? 'high' : 'medium',
          agentId: agent.agentId,
          role: agent.role,
          taskId: agent.currentTaskId,
          status: agent.status,
          deadlineAt: agent.deadlineAt,
          message: `${agent.role} 已超过截止时间，需要虾老大追问或改派。`
        });
      }
    }

    if (agent.status === 'blocked') {
      alerts.push({
        type: 'agent_blocked',
        severity: 'high',
        agentId: agent.agentId,
        role: agent.role,
        taskId: agent.currentTaskId,
        reason: agent.blockedReason,
        message: `${agent.role} 当前阻塞：${agent.blockedReason || '未提供原因'}`
      });
    }
  }

  const unresolvedConflicts = snapshot.events.filter((event) => event.type === 'conflict_detected');
  for (const event of unresolvedConflicts) {
    alerts.push({
      type: 'conflict_detected',
      severity: 'high',
      taskId: event.taskId,
      arbiter: event.arbiter,
      message: event.summary || '检测到角色冲突，需要仲裁。'
    });
  }

  return alerts;
}

module.exports = {
  AGENT_STATE_PATH,
  DEFAULT_AGENT_TIMEOUT_MINUTES,
  HANDOFFS_PATH,
  EVENTS_PATH,
  buildRuntimeSnapshot,
  createHandoff,
  detectConflict,
  detectOpenQuestions,
  ensureAgents,
  findRuntimeAlerts,
  hasReviewBlockers,
  markAgentIdle,
  markAgentWorking,
  recordEvent,
  updateAgent
};
