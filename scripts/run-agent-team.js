const fs = require('node:fs');
const path = require('node:path');

const TASKS_PATH = 'data/tasks.json';
const ASSIGNMENTS_PATH = 'data/assignments.json';
const OBSIDIAN_TASK_DIR = '/Users/dongdong/Documents/obsidian/虾团队记忆/02_任务记录';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(value) {
  return value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shortId(taskId) {
  return String(taskId).slice(0, 8);
}

function roleOutput(task, role) {
  const date = today();
  const id = shortId(task.id);

  const templates = {
    'The Director': {
      folder: 'outputs/director',
      suffix: 'direction',
      body: `# ${date} 虾老大任务判断

## 任务

${task.title}

## 判断

这次任务的核心目标是验证飞书任务能不能真正进入 X_Lab，并形成后续团队动作。

## 成功标准

- 飞书任务被读取到。
- X_Lab 数据被更新。
- 能看到具体角色分工。
- 至少生成一份 Brief。
- Brief 能写入 Obsidian。

## 参与角色

- 产品虾：确认链路和数据结构。
- 挑刺虾：检查风险和未完成自动化部分。
- 运营虾：生成简报和归档记录。
`
    },
    'The Architect': {
      folder: 'outputs/architect',
      suffix: 'structure',
      body: `# ${date} 产品虾结构方案

## 任务

${task.title}

## 数据链路

\`\`\`text
飞书任务
-> scripts/sync-feishu-tasks.js
-> data/tasks.json
-> data.json
-> X_Lab Overview
-> scripts/run-agent-team.js
-> outputs/
-> Obsidian
\`\`\`

## 产出文件

- data/tasks.json：飞书任务原始同步结果
- data/assignments.json：任务分配和角色产出记录
- outputs/*：每个角色的独立产出
- Obsidian 任务记录：最终汇总

## 下一步结构建议

把任务状态拆成明确阶段：

\`\`\`text
todo -> assigned -> produced -> archived -> done
\`\`\`
`
    },
    'The Critic': {
      folder: 'outputs/critic',
      suffix: 'review',
      body: `# ${date} 挑刺虾风险检查

## 任务

${task.title}

## 已验证

- 飞书任务同步成功。
- 本地数据校验通过。
- X_Lab 能显示任务数量。

## 当前风险

- 还没有自动回写飞书任务完成状态。
- 还没有真正的模型多 agent 推理，只是按规则生成角色产出。
- Obsidian 写入目前由本地脚本完成，不是云端自动执行。
- 如果飞书任务字段变化，解析脚本需要更新。

## 必须补的下一步

1. 自动生成 Brief 脚本稳定化。
2. 自动写入 Obsidian 脚本独立化。
3. 飞书任务完成状态回写。
4. 增加错误提示，避免小白看不懂失败原因。
`
    },
    'The Broadcaster': {
      folder: 'outputs/broadcaster',
      suffix: 'brief',
      body: `# ${date} 运营虾今日简报

## 今日测试任务

${task.title}

## 测试结果

飞书任务入口已经跑通。任务从飞书进入 X_Lab，随后被分配给虾团队角色，并生成了角色产出文件。

## 当前状态

- 飞书任务：已同步
- 虾团队分配：已生成
- 角色产出：已生成
- Obsidian 记录：待汇总写入

## 下一步

把“生成角色产出”和“写入 Obsidian”从测试流程升级为固定命令。
`
    }
  };

  const template = templates[role.role];
  if (!template) return null;

  ensureDir(template.folder);
  const filePath = path.join(template.folder, `${date}-task-${id}-${template.suffix}.md`);
  fs.writeFileSync(filePath, template.body);
  return filePath;
}

function buildObsidianRecord(task, outputs) {
  const date = today();
  const taskName = safeName(task.title);
  const fileName = `${date}_${taskName}_虾团队产出汇总.md`;
  const filePath = path.join(OBSIDIAN_TASK_DIR, fileName);

  const body = `# ${date} ${task.title} - 虾团队产出汇总

## 任务来源

飞书任务：

\`\`\`text
${task.title}
\`\`\`

任务链接：

\`\`\`text
${task.url || '无'}
\`\`\`

## 角色产出

${outputs.map((item) => `### ${item.cn} / ${item.role}

产出文件：

\`\`\`text
${item.output}
\`\`\`

负责内容：

${item.responsibility}`).join('\n\n')}

## 结论

这次测试已经从“只记录分配方案”升级为“每个参与角色都有独立产出文件”。

## 仍未完成

- 还没有自动回写飞书任务状态。
- 还没有接入真实 LLM 多 agent 调度。
- 还没有自动定时运行。

## Memory Tags

- #x-lab
- #feishu-task-intake
- #agent-team-output
- #shrimp-team
`;

  ensureDir(OBSIDIAN_TASK_DIR);
  fs.writeFileSync(filePath, body);
  return filePath;
}

function main() {
  const tasks = readJson(TASKS_PATH);
  const assignments = readJson(ASSIGNMENTS_PATH);
  const task = tasks.find((item) => item.status === 'assigned') || tasks[0];
  if (!task) {
    console.log('No task found. Run npm run sync:feishu first.');
    return;
  }

  const assignment = assignments.find((item) => item.taskId === task.id);
  if (!assignment) {
    throw new Error(`No assignment found for task ${task.id}`);
  }

  const outputs = assignment.workflow
    .map((role) => {
      const output = roleOutput(task, role);
      return output ? { ...role, output } : null;
    })
    .filter(Boolean);

  const obsidianRecord = buildObsidianRecord(task, outputs);

  assignment.status = 'produced';
  assignment.outputs = [
    ...new Set([
      ...(assignment.outputs || []),
      ...outputs.map((item) => item.output),
      obsidianRecord
    ])
  ];

  for (const item of tasks) {
    if (item.id === task.id) {
      item.status = 'produced';
    }
  }

  writeJson(TASKS_PATH, tasks);
  writeJson(ASSIGNMENTS_PATH, assignments);

  console.log(`Generated ${outputs.length} role output(s).`);
  console.log(`Wrote Obsidian record: ${obsidianRecord}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
