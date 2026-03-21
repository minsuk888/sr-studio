import {
  ExternalLink,
  Youtube,
  Newspaper,
  BookOpen,
  MessageSquare,
} from 'lucide-react';

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

// ---- YouTube 카드 ----
export function YoutubeCard({ item }) {
  return (
    <a
      href={item.videoId ? `https://youtube.com/watch?v=${item.videoId}` : '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg border border-surface-700 bg-surface-800 hover:bg-white/5 transition-colors group"
    >
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          className="w-28 h-[72px] rounded object-cover flex-shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Youtube size={11} className="text-red-500 flex-shrink-0" />
          <span className="text-[10px] text-red-400 font-medium">YouTube</span>
          {item._keyword && (
            <span className="text-[10px] text-gray-600 bg-surface-700 px-1.5 py-0.5 rounded">
              {item._keyword}
            </span>
          )}
        </div>
        <h4 className="text-xs font-medium text-white line-clamp-2 mb-1">
          {stripHtml(item.title)}
        </h4>
        <p className="text-[11px] text-gray-400">{item.channelTitle}</p>
        <p className="text-[11px] text-gray-500">{formatDate(item.publishedAt)}</p>
      </div>
      <ExternalLink
        size={12}
        className="text-gray-600 group-hover:text-gray-300 flex-shrink-0 mt-1 transition-colors"
      />
    </a>
  );
}

// ---- 뉴스 카드 ----
export function NewsCard({ item }) {
  const isNaver = item.source === 'naver';
  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg border border-surface-700 bg-surface-800 hover:bg-white/5 transition-colors group"
    >
      <div className={`w-28 h-[72px] rounded flex items-center justify-center flex-shrink-0 ${isNaver ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
        <Newspaper size={20} className={isNaver ? 'text-green-500/60' : 'text-blue-500/60'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Newspaper size={11} className={`flex-shrink-0 ${isNaver ? 'text-green-500' : 'text-blue-500'}`} />
          <span className={`text-[10px] font-medium ${isNaver ? 'text-green-400' : 'text-blue-400'}`}>
            {isNaver ? '네이버 뉴스' : '구글 뉴스'}
          </span>
          {item.publisher && (
            <span className="text-[10px] text-gray-600 truncate">{item.publisher}</span>
          )}
        </div>
        <h4 className="text-xs font-medium text-white line-clamp-2 mb-1">
          {stripHtml(item.title)}
        </h4>
        {item.summary && (
          <p className="text-[11px] text-gray-400 line-clamp-1">{stripHtml(item.summary)}</p>
        )}
        <p className="text-[11px] text-gray-500">{formatDate(item.date)}</p>
      </div>
      <ExternalLink
        size={12}
        className="text-gray-600 group-hover:text-gray-300 flex-shrink-0 mt-1 transition-colors"
      />
    </a>
  );
}

// ---- 블로그 카드 ----
export function BlogCard({ item }) {
  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg border border-surface-700 bg-surface-800 hover:bg-white/5 transition-colors group"
    >
      <div className="w-28 h-[72px] rounded bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
        <BookOpen size={20} className="text-emerald-500/60" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <BookOpen size={11} className="text-emerald-500 flex-shrink-0" />
          <span className="text-[10px] text-emerald-400 font-medium">블로그</span>
          {item.publisher && (
            <span className="text-[10px] text-gray-600 truncate">{item.publisher}</span>
          )}
        </div>
        <h4 className="text-xs font-medium text-white line-clamp-2 mb-1">
          {stripHtml(item.title)}
        </h4>
        {item.summary && (
          <p className="text-[11px] text-gray-400 line-clamp-1">{stripHtml(item.summary)}</p>
        )}
        <p className="text-[11px] text-gray-500">{formatDate(item.date)}</p>
      </div>
      <ExternalLink
        size={12}
        className="text-gray-600 group-hover:text-gray-300 flex-shrink-0 mt-1 transition-colors"
      />
    </a>
  );
}

// ---- 카페 카드 ----
export function CafeCard({ item }) {
  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg border border-surface-700 bg-surface-800 hover:bg-white/5 transition-colors group"
    >
      <div className="w-28 h-[72px] rounded bg-purple-500/10 flex items-center justify-center flex-shrink-0">
        <MessageSquare size={20} className="text-purple-500/60" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <MessageSquare size={11} className="text-purple-500 flex-shrink-0" />
          <span className="text-[10px] text-purple-400 font-medium">카페</span>
          {item.publisher && (
            <span className="text-[10px] text-gray-600 truncate">{item.publisher}</span>
          )}
        </div>
        <h4 className="text-xs font-medium text-white line-clamp-2 mb-1">
          {stripHtml(item.title)}
        </h4>
        {item.summary && (
          <p className="text-[11px] text-gray-400 line-clamp-1">{stripHtml(item.summary)}</p>
        )}
        <p className="text-[11px] text-gray-500">{formatDate(item.date)}</p>
      </div>
      <ExternalLink
        size={12}
        className="text-gray-600 group-hover:text-gray-300 flex-shrink-0 mt-1 transition-colors"
      />
    </a>
  );
}
