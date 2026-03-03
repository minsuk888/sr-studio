import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { noticesService } from '../services/noticesService';

function NoticeItem({ notice, onClick }) {
  return (
    <button
      onClick={() => onClick(notice.id)}
      className="inline-flex items-center gap-2 text-sm cursor-pointer bg-transparent border-none p-0 hover:text-brand-400 transition-colors shrink-0"
    >
      {notice.is_pinned && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 shrink-0">
          고정
        </span>
      )}
      <span className="text-gray-300 whitespace-nowrap">{notice.title}</span>
      <span className="text-surface-600 mx-6">|</span>
    </button>
  );
}

export default function NoticeTicker() {
  const [notices, setNotices] = useState([]);
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const [repeatCount, setRepeatCount] = useState(2);

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
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate how many repeats needed to fill the screen
  const calcRepeats = useCallback(() => {
    if (!trackRef.current || !containerRef.current || notices.length === 0) return;
    const containerW = containerRef.current.offsetWidth;
    // Measure width of one set of notices
    const items = trackRef.current.children;
    if (items.length === 0) return;
    let oneSetWidth = 0;
    for (let i = 0; i < notices.length && i < items.length; i++) {
      oneSetWidth += items[i].offsetWidth;
    }
    if (oneSetWidth === 0) return;
    // Need at least 2 sets to loop, but enough to cover 2x container width for seamless scroll
    const needed = Math.max(2, Math.ceil((containerW * 2) / oneSetWidth) + 1);
    setRepeatCount(needed);
  }, [notices]);

  useEffect(() => {
    calcRepeats();
    window.addEventListener('resize', calcRepeats);
    return () => window.removeEventListener('resize', calcRepeats);
  }, [calcRepeats]);

  const handleClick = (noticeId) => {
    navigate(`/notices?view=${noticeId}`);
  };

  if (notices.length === 0) return null;

  const repeatedNotices = Array.from({ length: repeatCount }, () => notices).flat();
  // Speed: ~60px per second for comfortable reading
  const duration = Math.max(10, (repeatCount * notices.length * 200) / 60);

  return (
    <div className="mb-4 bg-surface-800/80 backdrop-blur-sm rounded-xl overflow-hidden border border-surface-700/50">
      <style>{`
        @keyframes noticeTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / ${repeatCount} * ${Math.floor(repeatCount / 2)})); }
        }
        .notice-ticker-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>
      <div className="flex items-center h-10">
        <div className="shrink-0 flex items-center gap-1.5 px-4 z-10 bg-surface-800/80">
          <Megaphone className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-[11px] font-bold text-brand-400 tracking-wider">공지</span>
        </div>

        <div className="overflow-hidden flex-1" ref={containerRef}>
          <div
            ref={trackRef}
            className="flex whitespace-nowrap notice-ticker-track"
            style={{ animation: `noticeTicker ${duration}s linear infinite` }}
          >
            {repeatedNotices.map((notice, idx) => (
              <NoticeItem key={`${notice.id}-${idx}`} notice={notice} onClick={handleClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
