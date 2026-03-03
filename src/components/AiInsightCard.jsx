import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import renderMarkdown from '../utils/renderMarkdown';

export default function AiInsightCard({
  title = 'AI 인사이트',
  insight,
  loading,
  onGenerate,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [aiUsage, setAiUsage] = useState(null);
  const [limitError, setLimitError] = useState('');

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/auth?type=ai_call&limit=1');
      if (res.ok) {
        const data = await res.json();
        if (data.todayAiUsage) {
          setAiUsage(data.todayAiUsage);
        }
      }
    } catch {
      // 사용량 조회 실패 시 무시
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // insight가 바뀌면 (분석 완료 시) 사용량 갱신
  useEffect(() => {
    if (insight) {
      fetchUsage();
    }
  }, [insight, fetchUsage]);

  const isLimitExceeded = aiUsage && aiUsage.used >= aiUsage.limit;

  const handleGenerate = async () => {
    setLimitError('');
    try {
      await onGenerate();
    } catch (err) {
      if (err?.status === 429 || err?.message?.includes('한도')) {
        setLimitError('일일 AI 분석 한도를 초과했습니다. 내일 다시 시도해주세요.');
        fetchUsage();
      }
    }
  };

  const usageBadge = aiUsage ? (
    <span className={`text-xs ml-2 ${isLimitExceeded ? 'text-red-400' : 'text-gray-500'}`}>
      (오늘 {aiUsage.used}/{aiUsage.limit})
    </span>
  ) : null;

  return (
    <div className="bg-gradient-to-br from-brand-500/10 via-surface-800 to-purple-500/10 rounded-xl shadow-sm border border-brand-500/20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          <span className="text-sm font-semibold text-gray-300">{title}</span>
          {usageBadge}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {limitError && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              <AlertCircle size={14} />
              {limitError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-brand-400">
              <Loader className="w-5 h-5 animate-spin" />
              분석 중...
            </div>
          ) : insight ? (
            <>
              <div
                className="prose-sm max-w-none mb-3"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(insight) }}
              />
              <button
                onClick={handleGenerate}
                disabled={isLimitExceeded}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isLimitExceeded
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-brand-400 hover:bg-brand-500/10'
                }`}
              >
                <Sparkles size={12} />
                {isLimitExceeded ? '일일 한도 초과' : '다시 분석'}
              </button>
            </>
          ) : isLimitExceeded ? (
            <div className="text-center py-6">
              <div className="flex items-center justify-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} />
                일일 AI 분석 한도를 초과했습니다.
              </div>
              <p className="text-xs text-gray-500 mt-2">내일 다시 시도해주세요.</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <button
                onClick={handleGenerate}
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
