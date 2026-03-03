import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { noticesService } from '../services/noticesService';

export default function NoticeTicker() {
  const [notices, setNotices] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await noticesService.getActive();
        setNotices(data || []);
      } catch (error) {
        console.error('Failed to load notices for ticker:', error);
      }
    };
    load();

    // Refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Duplicate items for seamless loop
  const tickerItems = useMemo(() => {
    if (notices.length === 0) return [];
    return [...notices, ...notices];
  }, [notices]);

  const handleClick = (noticeId) => {
    navigate(`/notices?view=${noticeId}`);
  };

  if (notices.length === 0) return null;

  // Animation duration: base 15s + 5s per notice (so it doesn't go too fast)
  const duration = Math.max(15, notices.length * 5);

  return (
    <div className="mb-4 bg-surface-800/80 backdrop-blur-sm rounded-xl overflow-hidden border border-surface-700/50">
      <style>{`
        @keyframes noticeTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .notice-ticker-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>
      <div className="flex items-center h-10">
        {/* Badge */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 z-10 bg-surface-800/80">
          <Megaphone className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-[11px] font-bold text-brand-400 tracking-wider">공지</span>
        </div>

        {/* Scrolling Track */}
        <div className="overflow-hidden flex-1">
          <div
            className="flex gap-10 whitespace-nowrap notice-ticker-track"
            style={{ animation: `noticeTicker ${duration}s linear infinite` }}
          >
            {tickerItems.map((notice, idx) => (
              <button
                key={`${notice.id}-${idx}`}
                onClick={() => handleClick(notice.id)}
                className="inline-flex items-center gap-2 text-sm cursor-pointer bg-transparent border-none p-0 hover:text-brand-400 transition-colors"
              >
                {notice.is_pinned && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 shrink-0">
                    고정
                  </span>
                )}
                <span className="text-gray-300">{notice.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
