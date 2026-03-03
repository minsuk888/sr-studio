// =====================================================
// SR STUDIO — 마크다운 → HTML 렌더러
// Gemini AI 응답의 마크다운을 안전한 HTML로 변환
// =====================================================

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInline(text) {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-gray-200"><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-200">$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-surface-900 px-1.5 py-0.5 rounded text-xs text-gray-300">$1</code>');
}

/**
 * AI 응답 텍스트에서 코드 펜스/JSON 래퍼 제거
 */
export function cleanAiResponse(text) {
  if (!text) return '';
  let cleaned = text.trim();

  // ```json ... ``` 래퍼 제거 (전체를 감싸는 경우)
  const fenceMatch = cleaned.match(/^```(?:json|markdown|md)?\s*\n([\s\S]*?)\n\s*```\s*$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return cleaned;
}

/**
 * 마크다운 텍스트를 HTML로 변환
 * Gemini AI 응답에서 사용되는 패턴을 포괄적으로 지원
 */
export default function renderMarkdown(text) {
  if (!text) return '';

  const cleaned = cleanAiResponse(text);
  const lines = cleaned.split('\n');
  const html = [];
  let inCodeBlock = false;
  const codeLines = [];

  for (const line of lines) {
    // 코드 블록 시작/종료
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html.push(
          `<pre class="bg-surface-900/80 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code class="text-gray-400 whitespace-pre-wrap break-words">${codeLines.join('\n')}</code></pre>`
        );
        codeLines.length = 0;
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(escapeHtml(line));
      continue;
    }

    // 수평선
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      html.push('<hr class="border-surface-700 my-3" />');
      continue;
    }

    // 헤더 (#, ##, ###, ####)
    if (line.startsWith('#### ')) {
      html.push(`<h4 class="text-sm font-semibold text-gray-200 mt-3 mb-1.5">${formatInline(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith('### ')) {
      html.push(`<h3 class="text-sm font-bold text-white mt-4 mb-2">${formatInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      html.push(`<h2 class="text-base font-bold text-white mt-5 mb-2">${formatInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      html.push(`<h2 class="text-base font-bold text-white mt-5 mb-2">${formatInline(line.slice(2))}</h2>`);
      continue;
    }

    // 번호 목록 (1. , 2. , 등) — 들여쓰기 지원
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/);
    if (numMatch) {
      const depth = Math.floor(numMatch[1].length / 2);
      const indent = depth >= 2 ? 'ml-10' : depth >= 1 ? 'ml-6' : 'ml-4';
      html.push(`<li class="text-sm text-gray-400 leading-relaxed ${indent} mb-1 list-decimal">${formatInline(numMatch[3])}</li>`);
      continue;
    }

    // 비순서 목록 (- 또는 *) — 들여쓰기 지원
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (bulletMatch) {
      const depth = Math.floor(bulletMatch[1].length / 2);
      const indent = depth >= 2 ? 'ml-10' : depth >= 1 ? 'ml-6' : 'ml-4';
      html.push(`<li class="text-sm text-gray-400 leading-relaxed ${indent} mb-1 list-disc">${formatInline(bulletMatch[2])}</li>`);
      continue;
    }

    // 빈 줄
    if (line.trim() === '') {
      html.push('<div class="h-2"></div>');
      continue;
    }

    // 일반 텍스트 (굵은 전체 줄 포함)
    html.push(`<p class="text-sm text-gray-400 leading-relaxed mb-1.5">${formatInline(line)}</p>`);
  }

  // 닫히지 않은 코드 블록 처리
  if (inCodeBlock && codeLines.length > 0) {
    html.push(
      `<pre class="bg-surface-900/80 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code class="text-gray-400 whitespace-pre-wrap break-words">${codeLines.join('\n')}</code></pre>`
    );
  }

  return html.join('');
}
