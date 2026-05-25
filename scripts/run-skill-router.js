const fs = require('node:fs');
const path = require('node:path');

const TASKS_PATH = 'data/tasks.json';
const SKILL_RUNS_PATH = 'data/skill-runs.json';

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function extractRequestedSkill(title) {
  const value = String(title || '');
  const match = value.match(/^【Skill】\s*([^：:，, ]+)/i)
    || value.match(/^【技能】\s*([^：:，, ]+)/)
    || value.match(/^Skill[：:]\s*([^：:，, ]+)/i);

  return match?.[1] || '待虾老大匹配';
}

function selectSkillTask(tasks) {
  return tasks.find((task) => task.route === 'skill' && ['todo', 'assigned', 'produced', 'ai_produced', 'feishu_commented', 'needs_review'].includes(task.status));
}

function main() {
  const tasks = readJson(TASKS_PATH, []);
  const runs = readJson(SKILL_RUNS_PATH, []);
  const task = selectSkillTask(tasks);

  if (!task) {
    console.log('No Skill task found.');
    return;
  }

  const run = {
    id: `skill-${task.id}-${Date.now()}`,
    taskId: task.id,
    taskTitle: task.title,
    status: 'skill_pending',
    requestedSkill: extractRequestedSkill(task.title),
    routeReason: task.routeReason || '标题要求走固定技能流程。',
    instruction: '这是固定流程任务。下一步由虾老大匹配具体 skill，并把结果写回飞书任务 / X_Lab。',
    createdAt: new Date().toISOString()
  };

  runs.push(run);
  for (const item of tasks) {
    if (item.id === task.id) {
      item.status = 'skill_pending';
    }
  }

  writeJson(SKILL_RUNS_PATH, runs);
  writeJson(TASKS_PATH, tasks);

  console.log(`Skill route recorded: ${run.requestedSkill}`);
  console.log(`Task: ${run.taskTitle}`);
}

main();
