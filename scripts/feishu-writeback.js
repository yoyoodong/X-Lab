const { execFileSync } = require('node:child_process');

function runLark(args) {
  const output = execFileSync('lark-cli', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const parsed = JSON.parse(output);
  if (!parsed.ok) {
    throw new Error(parsed.error?.message || `lark-cli failed: ${args.join(' ')}`);
  }

  return parsed;
}

function limitText(value, maxLength) {
  if (!value) {
    return '';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function buildFeishuComment({ task, outputs, obsidianRecord, feishuWiki, reviewBlockers, sourceFollowup }) {
  const statusLine = sourceFollowup
    ? 'X_Lab 虾团队已完成本轮 AI 协作产出，但缺少可验证新闻来源。本任务不会自动关闭，先进入「待溯源」。'
    : reviewBlockers?.length
    ? 'X_Lab 虾团队已完成本轮 AI 协作产出，但检测到待确认事项，需要人工复核后再关闭任务。'
    : 'X_Lab 虾团队已完成本轮 AI 协作产出。';
  const lines = [
    statusLine,
    '',
    `任务：${task.title}`,
    '',
    '产出文件：'
  ];

  for (const item of outputs) {
    lines.push(`- ${item.role} / ${item.english}: ${item.output}`);
  }

  lines.push('');
  lines.push(`Obsidian 汇总：${obsidianRecord}`);

  if (feishuWiki?.wikiUrl || feishuWiki?.docUrl) {
    lines.push(`飞书知识库文档：${feishuWiki.wikiUrl || feishuWiki.docUrl}`);
  }

  if (sourceFollowup) {
    lines.push('');
    lines.push('下一步：新闻虾 / 侦察虾继续溯源');
    lines.push(`- 交付位置：${sourceFollowup.delivery}`);
    lines.push(`- 需要补齐：${sourceFollowup.required.join('、')}`);
    lines.push(`- 处理规则：${sourceFollowup.nextAction}`);
  }

  if (reviewBlockers?.length) {
    lines.push('');
    lines.push('待确认 / 需仲裁：');
    for (const blocker of reviewBlockers) {
      lines.push(`- ${blocker}`);
    }
  }

  const broadcaster = outputs.find((item) => item.id === 'content') || outputs[outputs.length - 1];
  if (broadcaster?.content) {
    lines.push('');
    lines.push('运营虾简报摘要：');
    lines.push(limitText(broadcaster.content.replace(/\n{3,}/g, '\n\n'), 1200));
  }

  lines.push('');
  lines.push(sourceFollowup ? '状态：待溯源。' : (reviewBlockers?.length ? '状态：已产出，待人工复核。' : '状态：已产出，已回写。'));

  return limitText(lines.join('\n'), 3500);
}

function commentOnTask(taskId, content) {
  return runLark([
    'task',
    '+comment',
    '--as',
    'user',
    '--task-id',
    taskId,
    '--content',
    content,
    '--format',
    'json'
  ]);
}

function completeTask(taskId) {
  return runLark([
    'task',
    '+complete',
    '--as',
    'user',
    '--task-id',
    taskId,
    '--format',
    'json'
  ]);
}

function writeBackFeishuTask({ task, outputs, obsidianRecord, feishuWiki, shouldComplete = true, reviewBlockers = [], sourceFollowup = null }) {
  if (!task?.id) {
    throw new Error('Missing Feishu task id.');
  }

  const content = buildFeishuComment({ task, outputs, obsidianRecord, feishuWiki, reviewBlockers, sourceFollowup });
  const commentResult = commentOnTask(task.id, content);

  const canComplete = shouldComplete && process.env.X_LAB_FEISHU_COMPLETE !== 'false' && !reviewBlockers.length && !sourceFollowup;
  const completeResult = canComplete ? completeTask(task.id) : null;

  return {
    commented: true,
    completed: canComplete,
    commentResult,
    completeResult
  };
}

module.exports = {
  buildFeishuComment,
  writeBackFeishuTask
};
