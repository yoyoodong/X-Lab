const fs = require('node:fs');
const { writeBackFeishuTask } = require('./feishu-writeback');

const DATA_PATH = 'data.json';
const TASKS_PATH = 'data/tasks.json';
const ASSIGNMENTS_PATH = 'data/assignments.json';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function selectAssignment(assignments) {
  return [...assignments]
    .reverse()
    .find((item) => Array.isArray(item.aiOutputs) && item.aiOutputs.length > 0);
}

function readOutput(item) {
  return {
    id: item.output.includes('/broadcaster/') ? 'content' : item.role,
    role: item.role,
    english: item.english,
    output: item.output,
    content: fs.existsSync(item.output) ? fs.readFileSync(item.output, 'utf8') : ''
  };
}

function main() {
  const tasks = readJson(TASKS_PATH);
  const assignments = readJson(ASSIGNMENTS_PATH);
  const data = fs.existsSync(DATA_PATH) ? readJson(DATA_PATH) : null;
  const assignment = selectAssignment(assignments);

  if (!assignment) {
    throw new Error('No AI assignment found. Run npm run director first.');
  }

  const task = tasks.find((item) => item.id === assignment.taskId);
  if (!task) {
    throw new Error(`Task not found: ${assignment.taskId}`);
  }

  const outputs = assignment.aiOutputs.map(readOutput);
  const obsidianRecord = [...(assignment.outputs || [])]
    .reverse()
    .find((item) => item.includes('AI虾老大调度汇总.md'));

  console.log(`Writing back to Feishu task: ${task.title}`);
  const result = writeBackFeishuTask({ task, outputs, obsidianRecord });

  task.status = result.completed ? 'feishu_completed' : 'feishu_commented';
  assignment.status = task.status;
  assignment.feishuWriteback = {
    commented: result.commented,
    completed: result.completed,
    completedAt: new Date().toISOString()
  };

  if (data?.tasks) {
    for (const item of data.tasks) {
      if (item.id === task.id) {
        item.status = task.status;
      }
    }
    data.summary.status = '虾团队已完成 AI 产出，并已回写飞书任务评论/状态。';
  }

  writeJson(TASKS_PATH, tasks);
  writeJson(ASSIGNMENTS_PATH, assignments);
  if (data) {
    writeJson(DATA_PATH, data);
  }

  console.log(`Feishu writeback complete. Status: ${task.status}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
