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
  const provider = getProvider();

  if (provider.name === 'deepseek') {
    return generateWithDeepSeek({ provider, instructions, input });
  }

  return generateWithOpenAI({ provider, instructions, input });
}

module.exports = {
  generateText
};
