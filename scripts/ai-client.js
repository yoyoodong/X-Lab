function getProvider() {
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      name: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      url: 'https://api.deepseek.com/chat/completions'
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-5',
      url: 'https://api.openai.com/v1/responses'
    };
  }

  throw new Error(
    'Missing AI API key. Set DEEPSEEK_API_KEY or OPENAI_API_KEY before running AI director.'
  );
}

function extractRoleLabel(input) {
  const match = String(input || '').match(/请你以「([^」]+)」身份/);
  return match?.[1] || '未知角色';
}

function buildOfflineDraft({ instructions, input }) {
  const roleLabel = extractRoleLabel(input);
  const commonLines = [
    `# ${roleLabel} 离线草稿`,
    '',
    '当前因为网络或 API 不可用，使用本地离线草稿继续推进。',
    '',
    '## 你对任务的理解',
    '当前资料未提供完整外部上下文，先按识别层和现有输入做保守处理。',
    '',
    '## 你负责的判断或方案',
    '先把任务边界和缺失信息写清楚，再决定是否进入下一层。',
    '',
    '## 你交付的具体内容',
    '- 识别当前任务状态',
    '- 标记需要补充的资料',
    '- 给出下一步承接建议',
    '',
    '## 风险或注意事项',
    '- 当前资料未提供',
    '- 如果缺少来源，不要假装已验证',
    '',
    '## 下一步应该交给谁',
    '交给虾老大根据路线继续分发。'
  ];

  if (/运营虾|Broadcaster/i.test(roleLabel)) {
    return [
      `# ${roleLabel} 离线草稿`,
      '',
      '## 最终结论',
      '当前适合先做选题评估，不宜直接发布。',
      '',
      '## 可直接使用的内容',
      '- 小红书标题：AI 会勒索人类？先看来源再决定要不要信',
      '- 封面文案：先别急着转发，先查来源',
      '- 正文结构：线索 -> 事实核验 -> 传播价值 -> 风险边界 -> 下一步',
      '',
      '## 风险边界',
      '当前资料未提供原始来源，不能直接当作已确认事实。',
      '',
      '## 下一步',
      '把来源补给新闻虾 / 侦察虾，再回到运营虾完善正式稿。'
    ].join('\n');
  }

  if (/挑刺虾|Critic/i.test(roleLabel)) {
    return [
      `# ${roleLabel} 离线草稿`,
      '',
      '## 风险结论',
      '当前事实不足，不建议直接发布。',
      '',
      '## 问题',
      '- 当前资料未提供原始来源',
      '- 传播风险高于确定性',
      '',
      '## 下一步',
      '先补来源，再复核标题、表述和发布边界。'
    ].join('\n');
  }

  if (/虾老大|Director/i.test(roleLabel)) {
    return [
      `# ${roleLabel} 离线草稿`,
      '',
      '## 任务判断',
      '先识别任务路线，再决定是十二怒汉、七武士还是 Skill。',
      '',
      '## 结论',
      '当前资料未提供足够信息，先进入识别层。',
      '',
      '## 下一步',
      '把任务分给合适路线后再继续。'
    ].join('\n');
  }

  return commonLines.join('\n');
}

async function generateWithDeepSeek({ provider, instructions, input }) {
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: input }
      ],
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
      stream: false
    })
  });

  const body = await response.json();

  if (!response.ok) {
    const message = body?.error?.message || `DeepSeek request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  const text = body?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('DeepSeek response did not contain message content.');
  }

  return text.trim();
}

async function generateWithOpenAI({ provider, instructions, input }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: provider.model,
      instructions,
      input
    })
  });

  const body = await response.json();

  if (!response.ok) {
    const message = body?.error?.message || `OpenAI request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  if (body.output_text) {
    return body.output_text.trim();
  }

  const text = (body.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text' && part.text)
    .map((part) => part.text)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('OpenAI response did not contain output text.');
  }

  return text;
}

async function generateText({ instructions, input }) {
  let provider;
  try {
    provider = getProvider();
  } catch (error) {
    return buildOfflineDraft({ instructions, input });
  }

  if (provider.name === 'deepseek') {
    try {
      return await generateWithDeepSeek({ provider, instructions, input });
    } catch (error) {
      return buildOfflineDraft({ instructions, input });
    }
  }

  try {
    return await generateWithOpenAI({ provider, instructions, input });
  } catch (error) {
    return buildOfflineDraft({ instructions, input });
  }
}

module.exports = {
  generateText
};
