const fs = require('node:fs');
const { publishToFeishuWiki } = require('./feishu-wiki-publish');

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
    role: item.role,
    english: item.english,
    output: item.output,
    content: fs.existsSync(item.output) ? fs.readFileSync(item.output, 'utf8') : ''
  };
}

function main() {
  const tasks = readJson(TASKS_PATH);
  const assignments = readJson(ASSIGNMENTS_PATH);
  const assignment = selectAssignment(assignments);

  if (!assignment) {
    throw new Error('No AI assignment found. Run npm run director first.');
  }

  const task = tasks.find((item) => item.id === assignment.taskId) || {
    id: assignment.taskId,
    title: assignment.taskTitle,
    source: assignment.source,
    status: assignment.status
  };

  const outputs = assignment.aiOutputs.map(readOutput);
  const obsidianRecord = [...(assignment.outputs || [])]
    .reverse()
    .find((item) => item.includes('AI虾老大调度汇总.md'));

  console.log(`Publishing to Feishu Wiki: ${assignment.taskTitle}`);
  const result = publishToFeishuWiki({ task, outputs, obsidianRecord });

  assignment.feishuWiki = result;
  assignment.outputs = [
    ...new Set([
      ...(assignment.outputs || []),
      result.wikiUrl || result.docUrl
    ].filter(Boolean))
  ];

  writeJson(ASSIGNMENTS_PATH, assignments);

  console.log(`Published to ${result.wikiSpaceName}: ${result.wikiUrl || result.docUrl}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
