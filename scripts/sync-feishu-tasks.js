const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { classifyTask } = require('./task-router');

const DATA_PATH = 'data.json';
const TASKS_DIR = 'data';
const TASKS_PATH = path.join(TASKS_DIR, 'tasks.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function normalizeTask(raw) {
  const id = pick(raw.guid, raw.id, raw.task_guid, raw.task_id, raw.entity_id, raw.url) || `feishu-${Date.now()}`;
  const title = pick(raw.summary, raw.title, raw.name, raw.subject, 'Untitled Feishu task');
  const due = pick(raw.due, raw.due_time, raw.due_at, raw.deadline);
  const url = pick(raw.url, raw.applink, raw.app_link);
  const completed = Boolean(pick(raw.completed, raw.complete, raw.is_completed, false));
  const route = classifyTask(title);

  return {
    id: String(id),
    source: 'feishu',
    title: String(title),
    status: completed ? 'done' : 'todo',
    route: route.route,
    routeLabel: route.routeLabel,
    routeReason: route.routeReason,
    due: due ? String(due) : '',
    url: url ? String(url) : '',
    owner: 'me',
    raw
  };
}

function fetchFeishuTasks() {
  const output = execFileSync(
    'lark-cli',
    ['task', '+get-my-tasks', '--as', 'user', '--complete=false', '--page-limit', '20', '--format', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const parsed = JSON.parse(output);
  if (!parsed.ok) {
    throw new Error(parsed.error?.message || 'lark-cli task sync failed');
  }
  return Array.isArray(parsed.data?.items) ? parsed.data.items : [];
}

function main() {
  const data = readJson(DATA_PATH);
  const rawTasks = fetchFeishuTasks();
  const tasks = rawTasks.map(normalizeTask);

  fs.mkdirSync(TASKS_DIR, { recursive: true });
  writeJson(TASKS_PATH, tasks);

  data.tasks = tasks.map(({ raw, ...task }) => task);
  data.summary.feishuTasks = tasks.length;
  data.summary.status = tasks.length
    ? `已从飞书同步 ${tasks.length} 个未完成任务，等待虾团队分配处理。`
    : '飞书任务入口已接通，当前没有同步到未完成任务。';

  const feishuLine = tasks.length
    ? `飞书任务入口：已同步 ${tasks.length} 个未完成任务。`
    : '飞书任务入口：已接通，当前没有未完成任务。';
  data.daily = [feishuLine, ...data.daily.filter((item) => !item.startsWith('飞书任务入口：'))];

  writeJson(DATA_PATH, data);

  console.log(`Synced ${tasks.length} Feishu task(s).`);
  console.log(`Updated ${DATA_PATH} and ${TASKS_PATH}.`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
