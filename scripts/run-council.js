const fs = require('node:fs');

const DATA_PATH = 'data.json';
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

function buildCouncilSession({ data, assignment }) {
  const layer = assignment.managementLayer || data.workspace?.managementLayer || {};
  const advisors = (layer.advisors || []).map((advisor) => ({
    id: advisor.id,
    name: advisor.name,
    role: advisor.role,
    view: buildAdvisorView(advisor, assignment)
  }));

  const needsSource = assignment.status === 'needs_source' || assignment.needsSource;
  const decision = needsSource ? '先溯源，暂停最终发布。' : (layer.decision || '可以进入七武士执行层。');
  const handoffTo = needsSource ? '新闻虾 / 侦察虾' : '七武士执行层';

  return {
    id: `council-${new Date().toISOString().slice(0, 10)}-${shortId(assignment.taskId)}`,
    createdAt: nowShanghai(),
    status: needsSource ? '待溯源' : '可执行',
    topic: assignment.taskTitle || data.workspace?.currentGoal || 'X_Lab 十二怒汉讨论',
    sourceTaskId: assignment.taskId || '',
    sourceTaskTitle: assignment.taskTitle || '',
    room: '十二怒汉虚拟讨论室',
    facilitator: layer.lead || '虾老大',
    goal: '先由十二怒汉判断方向，再由虾老大决定是否交给七武士执行。',
    advisors,
    directorSummary: needsSource
      ? '十二怒汉判断：当前证据不足。虾老大决定先让新闻虾/侦察虾补来源，再交给挑刺虾和运营虾。'
      : '十二怒汉判断：当前可以进入执行层。虾老大需要把方向拆成明确任务和交付物。',
    decision,
    handoff: {
      from: '虾老大',
      to: handoffTo,
      instruction: needsSource
        ? '提交来源卡：原始链接、发布时间、一手/二手判断、可信度评分、可引用摘要、是否建议继续给运营虾。'
        : '根据十二怒汉判断拆解任务，生成角色分工、交付物和完成标准。'
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
  const assignments = readJson(ASSIGNMENTS_PATH, []);
  const sessions = readJson(COUNCIL_PATH, []);
  const assignment = assignments[assignments.length - 1];

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
