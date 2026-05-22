const { execFileSync } = require('node:child_process');

const DEFAULT_WIKI_SPACE_ID = '7634432301040159694';
const DEFAULT_WIKI_SPACE_NAME = '虾调研';

function runLark(args) {
  const output = execFileSync('lark-cli', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const parsed = JSON.parse(output);
  if (parsed.ok === false || parsed.code) {
    const message = parsed.error?.message || parsed.msg || `lark-cli failed: ${args.join(' ')}`;
    throw new Error(message);
  }

  return parsed;
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

function cleanTitle(value) {
  return String(value || 'X_Lab 任务产出')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function buildWikiMarkdown({ task, outputs, obsidianRecord }) {
  const sections = outputs.map((item) => {
    return `## ${item.role} / ${item.english}

产出文件：

\`\`\`text
${item.output}
\`\`\`

${item.content}
`;
  }).join('\n\n---\n\n');

  return `# ${today()} ${task.title}

## 任务信息

- 来源：${task.source || 'feishu'}
- 状态：${task.status}
- 飞书任务：${task.url || '无'}
- Obsidian 记录：${obsidianRecord || '无'}

## 协作链路

本页由 X_Lab 自动生成。虾老大读取飞书任务、角色分工总表和角色卡后，依次调度角色完成产出。

${sections}
`;
}

function createFeishuDoc({ title, markdown }) {
  const result = runLark([
    'docs',
    '+create',
    '--as',
    'user',
    '--api-version',
    'v2',
    '--doc-format',
    'markdown',
    '--content',
    markdown
  ]);

  const document = result.data?.document || result.document;
  const objToken = document?.document_id || document?.token;
  const url = document?.url;

  if (!objToken) {
    throw new Error('Feishu document was created but no document_id was returned.');
  }

  return {
    objType: 'docx',
    objToken,
    url
  };
}

function moveDocToWiki({ objToken, wikiSpaceId }) {
  return runLark([
    'wiki',
    '+move',
    '--as',
    'user',
    '--obj-type',
    'docx',
    '--obj-token',
    objToken,
    '--target-space-id',
    wikiSpaceId
  ]);
}

function publishToFeishuWiki({ task, outputs, obsidianRecord }) {
  const wikiSpaceId = process.env.X_LAB_FEISHU_WIKI_SPACE_ID || DEFAULT_WIKI_SPACE_ID;
  const wikiSpaceName = process.env.X_LAB_FEISHU_WIKI_SPACE_NAME || DEFAULT_WIKI_SPACE_NAME;
  const title = `${today()} ${cleanTitle(task.title)}`;
  const markdown = buildWikiMarkdown({ task, outputs, obsidianRecord });
  const doc = createFeishuDoc({ title, markdown });
  const moveResult = moveDocToWiki({ objToken: doc.objToken, wikiSpaceId });
  const data = moveResult.data || moveResult;
  const wikiUrl = data.url || data.wiki_url || doc.url;

  return {
    title,
    wikiSpaceId,
    wikiSpaceName,
    objType: doc.objType,
    objToken: doc.objToken,
    docUrl: doc.url,
    wikiToken: data.wiki_token || data.node_token || '',
    wikiUrl,
    publishedAt: new Date().toISOString()
  };
}

module.exports = {
  buildWikiMarkdown,
  publishToFeishuWiki
};
