export class OpenRouterAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'anthropic/claude-haiku-4-5';
  }

  async complete(system, user, maxTokens = 800) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.href, 'X-Title': 'Job Hunt Automation' },
      body: JSON.stringify({ model: this.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature: 0.7 }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    return (await res.json()).choices[0].message.content.trim();
  }
}
