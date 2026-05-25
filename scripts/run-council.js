const fs = require('node:fs');

const DATA_PATH = 'data.json';
const TASKS_PATH = 'data/tasks.json';
const ASSIGNMENTS_PATH = 'data/assignments.json';
const COUNCIL_PATH = 'data/council-sessions.json';

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function nowShanghai() {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return `${formatter.format(new Date()).replace(' ', 'T')}+08:00`;
}

function shortId(value) {
  return String(value || Date.now()).slice(0, 8);
}

function buildAdvisorView(advisor, assignment) {
  const issue = assignment.issue || '当前任务还没有明确阻塞。';
  const question = advisor.question || '请判断这个任务是否值得继续。';

  return `${question} 当前判断：${issue} 所以先给出方向建议，再交给虾老大决定是否进入执行层。`;
}

function assignmentFromTask(task) {
  return {
    taskId: task.id,
    taskTitle: task.title,
    status: task.status,
    issue: task.routeReason || '这是十二怒汉议题，先判断方向再决定是否执行。',
    needsSource: /新闻|来源|溯源|线索/.test(task.title || ''),
    route: task.route,
    routeLabel: task.routeLabel,
    routeStage: task.routeStage,
    routePlan: task.routePlan,
    routeReason: task.routeReason
  };
}

function selectCouncilInput({ tasks, assignments }) {
  const routedTask = tasks.find((task) => {
    return task.route === 'council' && ['todo', 'assigned', 'produced', 'ai_produced', 'feishu_commented', 'needs_review', 'needs_source'].includes(task.status);
  });

  if (routedTask) {
    return assignmentFromTask(routedTask);
  }

  return assignments[assignments.length - 1] || null;
}

function buildCouncilSession({ data, assignment }) {
  const layer = assignment.managementLayer || data.workspace?.managementLayer || {};
  const advisors = (layer.advisors || []).map((advisor) => ({
    id: advisor.id,
    name: advisor.name,
    role: advisor.role,
    view: buildAdvisorView(advisor, assignment)
  }));

  const needsSource = assignment.status === 'needs_source' || assignment.needsSource;
  const isCouncilRoute = assignment.route === 'council' || /评估|是否值得|要不要做|值不值得|判断|分析|议题|讨论/.test(assignment.taskTitle || '');
  const decision = needsSource
    ? '先溯源，暂停最终发布。'
    : (isCouncilRoute ? '先讨论，确认是否值得继续。' : (layer.decision || '可以进入七武士执行层。'));
  const handoffTo = needsSource ? '新闻虾 / 侦察虾' : '七武士执行层';

  return {
    id: `council-${new Date().toISOString().slice(0, 10)}-${shortId(assignment.taskId)}`,
    createdAt: nowShanghai(),
    status: needsSource ? '待溯源' : (isCouncilRoute ? '待决策' : '可执行'),
    topic: assignment.taskTitle || data.workspace?.currentGoal || 'X_Lab 十二怒汉讨论',
    sourceTaskId: assignment.taskId || '',
    sourceTaskTitle: assignment.taskTitle || '',
    room: '十二怒汉虚拟讨论室',
    facilitator: layer.lead || '虾老大',
    goal: '先由十二怒汉判断方向，再由虾老大决定是否交给七武士执行。',
    advisors,
    directorSummary: needsSource
      ? '十二怒汉判断：当前证据不足。虾老大决定先让新闻虾/侦察虾补来源，再交给挑刺虾和运营虾。'
      : (isCouncilRoute
        ? '十二怒汉判断：这是一个需要先评估的议题。虾老大先收口问题，再决定是否进入七武士执行层。'
        : '十二怒汉判断：当前可以进入执行层。虾老大需要把方向拆成明确任务和交付物。'),
    decision,
    handoff: {
      from: '虾老大',
      to: handoffTo,
      instruction: needsSource
      ? '提交来源卡：原始链接、发布时间、一手/二手判断、可信度评分、可引用摘要、是否建议继续给运营虾。'
        : (isCouncilRoute
          ? '先把评估结论写清楚，再决定是否进入七武士执行层。'
          : '根据十二怒汉判断拆解任务，生成角色分工、交付物和完成标准。')
    },
    executionGate: needsSource
      ? [
        '新闻虾/侦察虾提交来源卡',
        '挑刺虾审查事实边界和发布风险',
        '运营虾基于可靠来源生成正式内容',
        '虾老大确认是否归档到飞书知识库'
      ]
      : [
        '虾老大拆解任务',
        '七武士执行',
        '挑刺虾复核',
        '写入飞书知识库和 Obsidian'
      ],
    outputs: [
      {
        title: '十二怒汉讨论纪要',
        target: 'X_Lab Council 面板'
      },
      {
        title: '下一步执行指令',
        target: handoffTo
      }
    ]
  };
}

function main() {
  const data = readJson(DATA_PATH, {});
  const tasks = readJson(TASKS_PATH, []);
  const assignments = readJson(ASSIGNMENTS_PATH, []);
  const sessions = readJson(COUNCIL_PATH, []);
  const assignment = selectCouncilInput({ tasks, assignments });

  if (!assignment) {
    throw new Error('No assignment found. Run Feishu sync or director first.');
  }

  const session = buildCouncilSession({ data, assignment });
  const existingIndex = sessions.findIndex((item) => item.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }

  writeJson(COUNCIL_PATH, sessions);
  console.log(`Council session written: ${COUNCIL_PATH}`);
  console.log(`Topic: ${session.topic}`);
  console.log(`Decision: ${session.decision}`);
}

main();
