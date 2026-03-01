const API_BASE = import.meta.env.DEV ? '' : '';

export const aiService = {
  async analyze(feature, context, prompt) {
    const res = await fetch(`${API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, context, prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'AI 분석 실패');
    }
    return await res.json();
  },
};
