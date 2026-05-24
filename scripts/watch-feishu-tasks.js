const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TASKS_PATH = 'data/tasks.json';
const ASSIGNMENTS_PATH = 'data/assignments.json';
const WATCH_STATE_PATH = 'data/watch-state.json';
const DEFAULT_INTERVAL_SECONDS = 60;

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

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadProcessedTaskIds() {
  const state = readJson(WATCH_STATE_PATH, { processedTaskIds: [] });
  const assignments = readJson(ASSIGNMENTS_PATH, []);
  const completedIds = assignments
    .filter((item) => item.status === 'feishu_completed')
    .map((item) => item.taskId);

  return new Set([...(state.processedTaskIds || []), ...completedIds]);
}

function saveProcessedTaskIds(processedTaskIds) {
  writeJson(WATCH_STATE_PATH, {
    updatedAt: new Date().toISOString(),
    processedTaskIds: [...processedTaskIds].sort()
  });
}

function getPendingTasks() {
  const tasks = readJson(TASKS_PATH, []);
  const processedTaskIds = loadProcessedTaskIds();

  return tasks.filter((task) => {
    if (processedTaskIds.has(task.id)) {
      return false;
    }

    return ['todo', 'assigned', 'produced', 'ai_produced', 'feishu_commented', 'needs_review'].includes(task.status);
  });
}

function syncFeishuTasks() {
  console.log('\n[watch] Syncing Feishu tasks...');
  runCommand('npm', ['run', 'sync:feishu']);
}

function runDirector() {
  console.log('\n[watch] Running X_Lab AI director...');
  runCommand('npm', ['run', 'director']);
}

async function runOnce() {
  syncFeishuTasks();

  const pendingTasks = getPendingTasks();
  if (!pendingTasks.length) {
    console.log('[watch] No new Feishu task found.');
    return 0;
  }

  console.log(`[watch] Found ${pendingTasks.length} new task(s).`);
  const pendingTaskIds = new Set(pendingTasks.map((task) => task.id));
  runDirector();

  const processedTaskIds = loadProcessedTaskIds();
  const tasksAfterRun = readJson(TASKS_PATH, []);
  const completedTasks = tasksAfterRun.filter((task) => {
    return pendingTaskIds.has(task.id) && task.status === 'feishu_completed';
  });

  for (const task of completedTasks) {
    processedTaskIds.add(task.id);
  }
  saveProcessedTaskIds(processedTaskIds);

  console.log(`[watch] Processing complete. Completed ${completedTasks.length} task(s).`);
  return completedTasks.length;
}

async function main() {
  const once = process.argv.includes('--once');
  const intervalSeconds = Number(process.env.X_LAB_WATCH_INTERVAL_SECONDS || DEFAULT_INTERVAL_SECONDS);

  if (once) {
    await runOnce();
    return;
  }

  console.log(`[watch] X_Lab Feishu watcher started. Interval: ${intervalSeconds}s`);
  console.log('[watch] Keep this terminal open. Press Ctrl+C to stop.');

  while (true) {
    try {
      await runOnce();
    } catch (error) {
      console.error(`[watch] ${error.message}`);
    }

    await sleep(intervalSeconds * 1000);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
