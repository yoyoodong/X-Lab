const fs = require('node:fs');
const path = require('node:path');
const { generateText } = require('./ai-client');
const { writeBackFeishuTask } = require('./feishu-writeback');
const { publishToFeishuWiki } = require('./feishu-wiki-publish');

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
  return outputs.map((item, index) => ({
    role: item.role,
    english: item.english,
    step: index + 1,
    status: finalStatus === 'feishu_completed' ? '已完成' : '已产出',
    output: item.output
  }));
}

function buildRoleInput({ task, role, teamTable, roleCard, previousOutputs }) {
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
  const content = await generateText({
    instructions: '你是 X_Lab 虾团队中的一个专业角色。严格遵守角色卡和团队分工，用中文输出 Markdown。',
    input
  });

  ensureDir(role.outputFolder);
  const filePath = path.join(role.outputFolder, `${today()}-task-${shortId(task.id)}-${role.outputName}.md`);
  fs.writeFileSync(filePath, content);

  return {
    id: role.id,
    role: role.role,
    english: role.english,
    output: filePath,
    content
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

  const teamTable = readText(TEAM_TABLE_PATH);
  const outputs = [];

  for (const role of ROLE_SEQUENCE) {
    console.log(`Running ${role.role}...`);
    const result = await runRole({ task, role, teamTable, previousOutputs: outputs });
    outputs.push(result);
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
    feishuWriteback = writeBackFeishuTask({ task, outputs, obsidianRecord, feishuWiki });
    finalStatus = feishuWriteback.completed ? 'feishu_completed' : 'feishu_commented';
  } catch (error) {
    feishuWriteback = {
      commented: false,
      completed: false,
      error: error.message,
      failedAt: new Date().toISOString()
    };
    console.error(`Feishu writeback failed: ${error.message}`);
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
  assignment.progress = buildProgress(outputs, finalStatus);
  assignment.feishuWiki = feishuWiki;
  assignment.feishuWriteback = feishuWriteback;
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
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
