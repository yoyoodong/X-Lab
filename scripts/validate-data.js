const fs = require('node:fs');

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const data = readJson('data.json');

assert(data.summary, 'data.json missing summary');
assert(Array.isArray(data.members), 'data.json missing members[]');
assert(Array.isArray(data.projects), 'data.json missing projects[]');
assert(Array.isArray(data.daily), 'data.json missing daily[]');
assert(Array.isArray(data.future), 'data.json missing future[]');
assert(Array.isArray(data.memory), 'data.json missing memory[]');
assert(Array.isArray(data.typeSets), 'data.json missing typeSets[]');

for (const member of data.members) {
  assert(member.name, 'member missing name');
  assert(member.cn, `member ${member.name || '<unknown>'} missing cn`);
  assert(member.role, `member ${member.name} missing role`);
  assert(member.image, `member ${member.name} missing image`);
  assert(typeof member.progress === 'number', `member ${member.name} progress must be number`);
}

if (fs.existsSync('data/tasks.json')) {
  const tasks = readJson('data/tasks.json');
  assert(Array.isArray(tasks), 'data/tasks.json must be an array');
  for (const task of tasks) {
    assert(task.id, 'task missing id');
    assert(task.title, `task ${task.id} missing title`);
    assert(task.source === 'feishu', `task ${task.id} source must be feishu`);
  }
}

console.log('X_Lab data validation passed.');
