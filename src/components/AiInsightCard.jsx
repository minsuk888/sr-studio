import { useState } from 'react';
import { Sparkles, Loader, ChevronDown, ChevronUp } from 'lucide-react';

function renderInsightText(text) {
  return text
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2">${line.slice(3)}</h3>`;
      if (line.startsWith('- ')) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-700">$1</strong>');
        return `<li class="text-sm text-slate-600 leading-relaxed ml-4 mb-1 list-disc">${content}</li>`;
      }
      if (line.trim() === '') return '<div class="h-1"></div>';
      const content = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-700">$1</strong>');
      return `<p class="text-sm text-slate-600 leading-relaxed mb-1">${content}</p>`;
    })
    .join('');
}

export default function AiInsightCard({
  title = 'AI 인사이트',
  insight,
  loading,
  onGenerate,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-sm border border-indigo-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-indigo-600">
              <Loader className="w-5 h-5 animate-spin" />
              분석 중...
            </div>
          ) : insight ? (
            <>
              <div
                className="prose-sm max-w-none mb-3"
                dangerouslySetInnerHTML={{ __html: renderInsightText(insight) }}
              />
              <button
                onClick={onGenerate}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Sparkles size={12} />
                다시 분석
              </button>
            </>
          ) : (
            <div className="text-center py-6">
              <button
                onClick={onGenerate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-sm"
              >
                <Sparkles size={14} />
                AI 분석 시작
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
