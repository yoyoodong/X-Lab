const fs = require('node:fs');
const path = require('node:path');
const { generateText } = require('./ai-client');
const { writeBackFeishuTask } = require('./feishu-writeback');
const { publishToFeishuWiki } = require('./feishu-wiki-publish');
const {
  createHandoff,
  detectConflict,
  detectOpenQuestions,
  ensureAgents,
  hasReviewBlockers,
  markAgentIdle,
  markAgentWorking,
  recordEvent,
  updateAgent
} = require('./agent-runtime');

const OBSIDIAN_ROOT = '/Users/dongdong/Documents/obsidian/虾团队记忆';
const TEAM_TABLE_PATH = path.join(OBSIDIAN_ROOT, '00_团队总则/角色分工总表.md');
const OBSIDIAN_TASK_DIR = path.join(OBSIDIAN_ROOT, '02_任务记录');
const DATA_PATH = 'data.json';
const TASKS_PATH = 'data/tasks.json';
const ASSIGNMENTS_PATH = 'data/assignments.json';

const ROLE_SEQUENCE = [
  {
    id: 'director',
    role: '虾老大',
    english: 'The Director',
    card: '01_角色卡/董虾捏_虾老大.md',
    outputFolder: 'outputs/ai/director',
    outputName: 'director-decision'
  },
  {
    id: 'product',
    role: '产品虾',
    english: 'The Architect',
    card: '01_角色卡/产品虾.md',
    outputFolder: 'outputs/ai/architect',
    outputName: 'architect-plan'
  },
  {
    id: 'critic',
    role: '挑刺虾',
    english: 'The Critic',
    card: '01_角色卡/挑刺虾.md',
    outputFolder: 'outputs/ai/critic',
    outputName: 'critic-review'
  },
  {
    id: 'content',
    role: '运营虾',
    english: 'The Broadcaster',
    card: '01_角色卡/运营虾.md',
    outputFolder: 'outputs/ai/broadcaster',
    outputName: 'broadcaster-brief'
  }
];

const SOURCE_FOLLOWUP_TEMPLATE = {
  owner: '新闻虾 / 侦察虾',
  status: '待溯源',
  required: [
    '原始链接',
    '发布时间',
    '一手/二手来源判断',
    '可信度评分',
    '可引用摘要',
    '是否建议继续交给运营虾'
  ],
  delivery: '飞书群或共享文档'
};

const MANAGEMENT_ADVISORS = [
  {
    id: 'steve-jobs-perspective',
    name: 'Steve Jobs',
    role: '产品体验、取舍与端到端完成度',
    question: '这个方向是否足够简单、清晰，能不能让用户第一眼就理解价值？'
  },
  {
    id: 'paul-graham-perspective',
    name: 'Paul Graham',
    role: '用户问题与最小可用版本',
    question: '谁会真的需要这个结果，最小但有用的版本是什么？'
  },
  {
    id: 'zhang-yiming-perspective',
    name: '张一鸣',
    role: '长期主义、组织效率与信息分发',
    question: '这个任务是否有清晰目标、有效反馈和可持续迭代机制？'
  },
  {
    id: 'andrej-karpathy-perspective',
    name: 'Andrej Karpathy',
    role: 'AI 工程现实与能力边界',
    question: '这套自动化是否可靠、可调试，哪里可能被模型能力边界卡住？'
  },
  {
    id: 'ilya-sutskever-perspective',
    name: 'Ilya Sutskever',
    role: 'AI 方向、安全与研究判断',
    question: '这个 AI 系统的关键假设是什么，安全边界和能力边界在哪里？'
  },
  {
    id: 'elon-musk-perspective',
    name: 'Elon Musk',
    role: '第一性原理与执行压缩',
    question: '这件事能不能更直接、更便宜、更快地验证？'
  },
  {
    id: 'munger-perspective',
    name: 'Charlie Munger',
    role: '反向思考、激励与认知偏误',
    question: '如果这个任务失败，最可能是哪个低级错误造成的？'
  },
  {
    id: 'feynman-perspective',
    name: 'Richard Feynman',
    role: '反自欺与真正理解',
    question: '我们是真的理解了，还是只是在复述好听的概念？'
  },
  {
    id: 'naval-perspective',
    name: 'Naval Ravikant',
    role: '杠杆、复利与可复用资产',
    question: '这次产出能否沉淀成可复用资产或自动化流程？'
  },
  {
    id: 'taleb-perspective',
    name: 'Nassim Nicholas Taleb',
    role: '尾部风险与反脆弱',
    question: '这里有没有低概率高损失风险，怎样让系统更抗冲击？'
  }
];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function today() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.format(new Date());
}

function shortId(taskId) {
  return String(taskId).slice(0, 8);
}

function safeName(value) {
  return value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function selectTask(tasks) {
  return tasks.find((task) => task.status === 'produced')
    || tasks.find((task) => task.status === 'assigned')
    || tasks.find((task) => task.status === 'todo')
    || tasks.find((task) => task.status === 'ai_produced')
    || tasks.find((task) => task.status === 'feishu_commented');
}

function inferTaskType(title) {
  if (/新闻|线索|选题|热点|趋势/.test(title)) {
    return 'signal';
  }

  if (/设计|视觉|图片|海报|页面|UI/.test(title)) {
    return 'design';
  }

  if (/研究|资料|调研|分析/.test(title)) {
    return 'research';
  }

  if (/文案|推文|内容|运营|发布/.test(title)) {
    return 'content';
  }

  return 'task';
}

function inferHandoff(task, outputs) {
  const title = task.title || '';
  const text = `${title}\n${outputs.map((item) => item.content.slice(0, 1000)).join('\n')}`;

  if (/新闻虾|侦察虾|新闻|线索/.test(text) && /运营虾|内容|选题/.test(text)) {
    return {
      from: '新闻虾 / 侦察虾',
      to: '运营虾',
      reason: '发现信息信号后，交给运营虾评估传播价值并产出内容角度。'
    };
  }

  if (/设计虾|视觉|图片|海报|页面/.test(text)) {
    return {
      from: '虾老大',
      to: '设计虾',
      reason: '任务需要视觉呈现或界面表达。'
    };
  }

  return {
    from: '虾老大',
    to: '虾团队',
    reason: '由虾老大判断任务性质后，分配给合适角色协作处理。'
  };
}

function buildProgress(outputs, finalStatus) {
  const progress = outputs.map((item, index) => ({
    role: item.role,
    english: item.english,
    step: index + 1,
    status: finalStatus === 'feishu_completed' ? '已完成' : '已产出',
    output: item.output
  }));

  if (finalStatus === 'needs_source') {
    progress.unshift({
      role: '新闻虾 / 侦察虾',
      english: 'The News Scout',
      step: 0,
      status: '待溯源',
      output: '待补原始来源、发布时间、可信度和可引用证据'
    });
  }

  return progress;
}

function summarizeOutput(content) {
  const normalized = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !line.startsWith('#') && !line.startsWith('|'));

  return normalized ? normalized.slice(0, 160) : '已生成角色产出。';
}

function hasSourceRequirement(task) {
  const title = task.title || '';
  return /新闻|线索|选题|热点|趋势|来源|溯源|原始链接|可信度/.test(title);
}

function detectsMissingSource({ task, outputs }) {
  if (!hasSourceRequirement(task)) {
    return false;
  }

  const text = [
    task.title || '',
    task.description || '',
    ...outputs.map((item) => item.content || ''),
    ...outputs.flatMap((item) => item.openQuestions || [])
  ].join('\n');

  return /当前资料未提供|原始来源.*未提供|来源.*未提供|缺少.*来源|缺少.*溯源|无法确认.*来源|无法判断.*可信度|待补.*来源|需要补充.*来源|需要补充.*原始|没有.*溯源报告/.test(text);
}

function buildSourceFollowup(task) {
  return {
    ...SOURCE_FOLLOWUP_TEMPLATE,
    taskId: task.id,
    reason: '这是新闻/线索类任务，但当前产出缺少可验证来源，不能直接进入最终发布或关闭任务。',
    nextAction: '新闻虾/侦察虾先交付溯源报告，再反馈给挑刺虾和运营虾继续审查与产出。'
  };
}

function buildManagementLayer({ task, needsSource, needsReview, conflict }) {
  const decision = needsSource
    ? '先溯源，暂停最终发布。'
    : (needsReview ? '先复核，再决定是否进入最终交付。' : '可以进入七武士执行层继续推进。');
  const nextHandoff = needsSource
    ? '虾老大把任务交给新闻虾 / 侦察虾补齐来源，再回给挑刺虾和运营虾。'
    : (needsReview ? '虾老大先处理待确认事项，再安排执行角色继续。' : '虾老大把方向转成明确任务，交给七武士执行。');

  return {
    lead: '虾老大',
    mode: 'management_direction_review',
    taskId: task.id,
    taskTitle: task.title,
    decision,
    nextHandoff,
    advisors: MANAGEMENT_ADVISORS,
    gates: [
      '方向是否值得做',
      '事实是否足够可靠',
      '风险是否可控',
      '产出是否能复用',
      '是否可以交给七武士执行'
    ],
    blocker: conflict?.summary || (needsSource ? '缺少可验证新闻来源。' : '')
  };
}

function buildRoleInput({ task, role, teamTable, roleCard, previousOutputs }) {
  const finalOutputRule = role.id === 'content'
    ? `
## 运营虾特别要求

你的输出必须优先像“最终交付物”，不是过程记录。请把可直接给用户看的内容放在最前面，例如：

1. 最终结论
2. 可直接使用的内容角度 / 简报 / 草稿 / 发布建议
3. 风险边界
4. 下一步动作

过程说明可以简短放在后面。`
    : '';

  return `你正在参与 X_Lab 虾团队任务。

## 当前日期

${today()}

所有标题、生成时间、记录日期都必须使用这个日期。不要使用其他日期。

## 飞书任务

标题：${task.title}
链接：${task.url || '无'}
当前状态：${task.status}

## 团队分工总表

${teamTable}

## 你的角色卡

${roleCard}

## 前面角色已经产出的内容

${previousOutputs.length ? previousOutputs.map((item) => `### ${item.role}\n\n${item.content}`).join('\n\n') : '暂无。你是本轮第一个角色。'}

## 本次要求

请你以「${role.role} / ${role.english}」身份独立思考并输出 Markdown。
${finalOutputRule}

硬性规则：

- 只能使用本提示中提供的信息。
- 不要编造今日情报、项目进度、外部新闻、其他虾的产出。
- 如果资料里没有，就明确写“当前资料未提供”。
- 如果需要更多资料，就写“需要补充的资料”，不要假装已经知道。
- 这是测试任务，重点是验证飞书任务入口和 AI 调度链路。

必须包含：

1. 你对任务的理解
2. 你负责的判断或方案
3. 你交付的具体内容
4. 风险或注意事项
5. 下一步应该交给谁

不要泛泛而谈。输出要能直接保存成项目文件。`;
}

async function runRole({ task, role, teamTable, previousOutputs }) {
  const roleCard = readText(path.join(OBSIDIAN_ROOT, role.card));
  const input = buildRoleInput({ task, role, teamTable, roleCard, previousOutputs });
  markAgentWorking(role.id, task.id);
  recordEvent('agent_started', {
    taskId: task.id,
    agentId: role.id,
    role: role.role
  });

  const content = await generateText({
    instructions: '你是 X_Lab 虾团队中的一个专业角色。严格遵守角色卡和团队分工，用中文输出 Markdown。',
    input
  });

  ensureDir(role.outputFolder);
  const filePath = path.join(role.outputFolder, `${today()}-task-${shortId(task.id)}-${role.outputName}.md`);
  fs.writeFileSync(filePath, content);

  const openQuestions = detectOpenQuestions(content);
  updateAgent(role.id, {
    status: openQuestions.length ? 'waiting_input' : 'handoff_ready',
    currentTaskId: task.id,
    lastOutput: filePath,
    waitingFor: openQuestions.length ? openQuestions : null,
    blockedReason: null
  });
  recordEvent('agent_output_created', {
    taskId: task.id,
    agentId: role.id,
    role: role.role,
    output: filePath,
    openQuestions
  });

  return {
    id: role.id,
    role: role.role,
    english: role.english,
    output: filePath,
    content,
    openQuestions
  };
}

function writeObsidianSummary(task, outputs) {
  ensureDir(OBSIDIAN_TASK_DIR);
  const outputList = outputs
    .map((item) => `### ${item.role} / ${item.english}

产出文件：

\`\`\`text
${item.output}
\`\`\`

摘要：

${item.content.slice(0, 800)}`)
    .join('\n\n');

  const filePath = path.join(
    OBSIDIAN_TASK_DIR,
    `${today()}_${safeName(task.title)}_AI虾老大调度汇总.md`
  );

  const body = `# ${today()} ${task.title} - AI虾老大调度汇总

## 任务来源

飞书任务：

\`\`\`text
${task.title}
\`\`\`

任务链接：

\`\`\`text
${task.url || '无'}
\`\`\`

## 说明

本记录由 \`npm run director\` 生成。虾老大读取飞书任务、团队分工总表和角色卡后，依次调度各角色完成产出。

## 角色产出

${outputList}

## Memory Tags

- #x-lab
- #ai-director
- #agent-team-output
- #feishu-task-intake
`;

  fs.writeFileSync(filePath, body);
  return filePath;
}

async function main() {
  const data = fs.existsSync(DATA_PATH) ? readJson(DATA_PATH) : null;
  const tasks = readJson(TASKS_PATH);
  const assignments = fs.existsSync(ASSIGNMENTS_PATH) ? readJson(ASSIGNMENTS_PATH) : [];
  const task = selectTask(tasks);

  if (!task) {
    console.log('No task found. Run npm run sync:feishu first.');
    return;
  }

  ensureAgents(ROLE_SEQUENCE);
  recordEvent('task_selected', {
    taskId: task.id,
    title: task.title,
    status: task.status
  });

  const teamTable = readText(TEAM_TABLE_PATH);
  const outputs = [];
  const handoffs = [];

  for (const [index, role] of ROLE_SEQUENCE.entries()) {
    console.log(`Running ${role.role}...`);
    const result = await runRole({ task, role, teamTable, previousOutputs: outputs });
    outputs.push(result);

    const nextRole = ROLE_SEQUENCE[index + 1] || null;
    const handoff = createHandoff({
      task,
      fromRole: role,
      toRole: nextRole,
      output: result.output,
      summary: summarizeOutput(result.content),
      openQuestions: result.openQuestions,
      status: result.openQuestions.length ? 'waiting_input' : 'handoff_ready'
    });
    handoffs.push(handoff);
  }

  const conflict = detectConflict(outputs);
  const needsSource = detectsMissingSource({ task, outputs });
  const sourceFollowup = needsSource ? buildSourceFollowup(task) : null;
  const sourceBlockers = sourceFollowup
    ? [`缺少新闻虾/侦察虾溯源报告：需要${sourceFollowup.required.join('、')}。`]
    : [];
  const reviewBlockers = [
    ...sourceBlockers,
    ...outputs.flatMap((item) => {
      return (item.openQuestions || []).map((question) => `${item.role}: ${question}`);
    }),
    ...(conflict ? [conflict.summary] : [])
  ];
  const needsReview = hasReviewBlockers({ conflict, outputs });
  const shouldHoldTask = needsSource || needsReview;

  if (sourceFollowup) {
    recordEvent('source_followup_required', {
      taskId: task.id,
      ...sourceFollowup
    });
    updateAgent('scout', {
      role: '新闻虾 / 侦察虾',
      english: 'The News Scout',
      status: 'waiting_source',
      currentTaskId: task.id,
      blockedReason: sourceFollowup.reason,
      waitingFor: sourceFollowup.required
    });
  }

  if (conflict) {
    recordEvent('conflict_detected', {
      taskId: task.id,
      ...conflict
    });
    updateAgent('director', {
      status: 'blocked',
      currentTaskId: task.id,
      blockedReason: conflict.summary
    });
  }

  const obsidianRecord = writeObsidianSummary(task, outputs);
  let feishuWiki = null;
  try {
    console.log('Publishing to Feishu Wiki...');
    feishuWiki = publishToFeishuWiki({ task, outputs, obsidianRecord });
  } catch (error) {
    feishuWiki = {
      error: error.message,
      failedAt: new Date().toISOString()
    };
    console.error(`Feishu Wiki publish failed: ${error.message}`);
  }

  let feishuWriteback = null;
  let finalStatus = 'ai_produced';

  try {
    console.log('Writing back to Feishu task...');
    feishuWriteback = writeBackFeishuTask({
      task,
      outputs,
      obsidianRecord,
      feishuWiki,
      shouldComplete: !shouldHoldTask,
      reviewBlockers,
      sourceFollowup
    });
    finalStatus = feishuWriteback.completed ? 'feishu_completed' : (needsSource ? 'needs_source' : (needsReview ? 'needs_review' : 'feishu_commented'));
  } catch (error) {
    feishuWriteback = {
      commented: false,
      completed: false,
      error: error.message,
      failedAt: new Date().toISOString()
    };
    console.error(`Feishu writeback failed: ${error.message}`);
    finalStatus = needsSource ? 'needs_source' : (needsReview ? 'needs_review' : finalStatus);
  }

  for (const item of tasks) {
    if (item.id === task.id) {
      item.status = finalStatus;
    }
  }

  if (data?.tasks) {
    for (const item of data.tasks) {
      if (item.id === task.id) {
        item.status = finalStatus;
      }
    }
    data.summary.status = feishuWriteback?.commented
      ? '虾团队已完成 AI 产出，并已回写飞书任务评论/状态。'
      : '虾团队已完成 AI 产出，但飞书回写失败，请查看 data/assignments.json。';
  }

  let assignment = assignments.find((item) => item.taskId === task.id);
  if (!assignment) {
    assignment = {
      taskId: task.id,
      taskTitle: task.title,
      source: task.source || 'feishu',
      workflow: ROLE_SEQUENCE.map((role) => ({
        role: role.english,
        cn: role.role,
        responsibility: `${role.role} 参与本轮 AI 协作产出。`
      })),
      outputs: []
    };
    assignments.push(assignment);
  }

  assignment.status = finalStatus;
  assignment.intake = {
    type: inferTaskType(task.title),
    title: task.title,
    source: task.source || 'feishu',
    url: task.url || '',
    receivedAt: task.raw?.created_at || new Date().toISOString()
  };
  assignment.handoff = inferHandoff(task, outputs);
  assignment.handoffs = handoffs;
  assignment.conflict = conflict;
  assignment.needsReview = needsReview;
  assignment.needsSource = needsSource;
  assignment.sourceFollowup = sourceFollowup;
  assignment.managementLayer = buildManagementLayer({ task, needsSource, needsReview, conflict });
  assignment.reviewBlockers = reviewBlockers;
  assignment.openQuestions = outputs.flatMap((item) => {
    return (item.openQuestions || []).map((question) => ({
      role: item.role,
      question
    }));
  });
  assignment.progress = buildProgress(outputs, finalStatus);
  assignment.feishuWiki = feishuWiki;
  assignment.feishuWriteback = feishuWriteback;
  assignment.issue = needsSource
    ? '缺少新闻虾/侦察虾溯源报告，不能确认事实边界和发布风险。'
    : (needsReview ? '存在待确认事项，需要人工复核后再关闭任务。' : '暂无阻塞。');
  assignment.nextAction = needsSource
    ? sourceFollowup.nextAction
    : (needsReview ? '先处理待确认事项，再决定是否发布或完成任务。' : '查看飞书知识库正式文档，决定是否继续发布或二次加工。');
  assignment.aiOutputs = outputs.map((item) => ({
    role: item.role,
    english: item.english,
    output: item.output
  }));
  assignment.outputs = [
    ...new Set([
      ...(assignment.outputs || []),
      ...outputs.map((item) => item.output),
      obsidianRecord,
      feishuWiki?.wikiUrl || feishuWiki?.docUrl
    ])
  ].filter(Boolean);

  writeJson(TASKS_PATH, tasks);
  writeJson(ASSIGNMENTS_PATH, assignments);
  if (data) {
    writeJson(DATA_PATH, data);
  }

  console.log(`Generated ${outputs.length} AI role output(s).`);
  console.log(`Wrote Obsidian record: ${obsidianRecord}`);
  if (feishuWiki?.wikiUrl || feishuWiki?.docUrl) {
    console.log(`Published Feishu Wiki document: ${feishuWiki.wikiUrl || feishuWiki.docUrl}`);
  }
  if (feishuWriteback?.commented) {
    console.log(`Wrote Feishu comment. Task status: ${finalStatus}`);
  }

  for (const role of ROLE_SEQUENCE) {
    const output = outputs.find((item) => item.id === role.id);
    if (output && !output.openQuestions?.length && role.id !== 'director') {
      markAgentIdle(role.id);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
