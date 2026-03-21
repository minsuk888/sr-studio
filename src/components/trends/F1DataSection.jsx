import { useState, useEffect } from 'react';
import {
  Calendar,
  Trophy,
  MapPin,
  Clock,
  Loader,
  ChevronDown,
  ChevronUp,
  Flag,
} from 'lucide-react';
import { f1Service } from '../../services/f1Service';

function formatSessionDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatSessionTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function getSessionLabel(name) {
  const map = {
    'Practice 1': 'FP1',
    'Practice 2': 'FP2',
    'Practice 3': 'FP3',
    'Qualifying': '예선',
    'Sprint Qualifying': '스프린트 예선',
    'Sprint': '스프린트',
    'Race': '결승',
  };
  return map[name] || name;
}

function MeetingCard({ meeting, isUpcoming }) {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const handleToggle = async () => {
    if (!expanded && sessions.length === 0) {
      setLoadingSessions(true);
      try {
        const data = await f1Service.getSessions(meeting.meeting_key);
        setSessions(data || []);
      } catch (err) {
        console.error('세션 로드 실패:', err);
      } finally {
        setLoadingSessions(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isUpcoming
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-surface-700 bg-surface-800'
      }`}
    >
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 text-left cursor-pointer"
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isUpcoming ? 'bg-red-500/20' : 'bg-surface-700'
          }`}
        >
          <Flag size={16} className={isUpcoming ? 'text-red-400' : 'text-gray-500'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-white truncate">
              {meeting.meeting_name}
            </h4>
            {isUpcoming && (
              <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-medium shrink-0">
                NEXT
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={10} />
              {meeting.location || meeting.country_name}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar size={10} />
              {formatSessionDate(meeting.date_start)}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-gray-500 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-surface-700">
          {loadingSessions ? (
            <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
              <Loader size={12} className="animate-spin" />
              세션 정보 로딩 중...
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-1.5">
              {sessions.map((session) => (
                <div
                  key={session.session_key}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5"
                >
                  <span className="text-[11px] font-medium text-gray-300 w-20 shrink-0">
                    {getSessionLabel(session.session_name)}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Calendar size={10} />
                    {formatSessionDate(session.date_start)}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Clock size={10} />
                    {formatSessionTime(session.date_start)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-2">세션 정보가 없습니다</p>
          )}
        </div>
      )}
    </div>
  );
}

function LatestRaceResults() {
  const [results, setResults] = useState(null);
  const [raceName, setRaceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const meetings = await f1Service.getMeetings();
        if (!meetings || meetings.length === 0) {
          setError('미팅 데이터 없음');
          return;
        }

        const now = new Date();
        const pastMeetings = meetings.filter((m) => new Date(m.date_start) < now);
        if (pastMeetings.length === 0) {
          setError('완료된 레이스가 없습니다');
          return;
        }

        const latestMeeting = pastMeetings[pastMeetings.length - 1];
        setRaceName(latestMeeting.meeting_name);

        const sessions = await f1Service.getSessions(latestMeeting.meeting_key);
        const raceSession = sessions?.find((s) => s.session_name === 'Race');
        if (!raceSession) {
          setError('결승 세션 데이터 없음');
          return;
        }

        const [positions, drivers] = await Promise.all([
          f1Service.getPositions(raceSession.session_key),
          f1Service.getDrivers(raceSession.session_key),
        ]);

        const driverMap = new Map();
        (drivers || []).forEach((d) => {
          driverMap.set(d.driver_number, d);
        });

        const top10 = (positions || []).slice(0, 10).map((pos) => {
          const driver = driverMap.get(pos.driver_number) || {};
          return {
            position: pos.position,
            name: driver.full_name || driver.name_acronym || `#${pos.driver_number}`,
            team: driver.team_name || '-',
            number: pos.driver_number,
          };
        });

        setResults(top10);
      } catch (err) {
        console.error('최신 레이스 결과 로드 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-gray-400 justify-center">
        <Loader size={12} className="animate-spin" />
        최신 레이스 결과 로딩 중...
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-gray-500">{error || '결과 데이터 없음'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Trophy size={18} className="text-yellow-500" />
        <h2 className="text-base font-semibold text-white">
          최신 레이스 결과
        </h2>
        <span className="text-[10px] text-gray-600 bg-surface-700 px-2 py-0.5 rounded-full">
          {raceName}
        </span>
      </div>

      <div className="rounded-xl border border-surface-700 bg-surface-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 bg-surface-900/50">
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500 w-16">순위</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500">드라이버</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500">팀</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.number} className="border-b border-surface-700/50 last:border-b-0 hover:bg-white/5">
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-bold ${
                    r.position === 1 ? 'text-yellow-400' :
                    r.position === 2 ? 'text-gray-300' :
                    r.position === 3 ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    P{r.position}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-white font-medium">{r.name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{r.team}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function F1DataSection() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await f1Service.getMeetings();
        setMeetings(data || []);
      } catch (err) {
        console.error('F1 미팅 로드 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
        <Loader className="w-5 h-5 animate-spin" />
        F1 시즌 일정 로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Trophy size={36} className="text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">F1 데이터를 불러올 수 없습니다</p>
        <p className="text-xs text-gray-500 mt-1">{error}</p>
      </div>
    );
  }

  const now = new Date();
  const upcomingIdx = meetings.findIndex((m) => new Date(m.date_start) > now);
  const displayMeetings = showAll ? meetings : meetings.slice(
    Math.max(0, upcomingIdx - 2),
    upcomingIdx + 4,
  );

  return (
    <div className="space-y-8">
      {/* Season Schedule */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-red-500" />
            <h2 className="text-base font-semibold text-white">
              {now.getFullYear()} F1 시즌 일정
            </h2>
            <span className="text-[10px] text-gray-600 bg-surface-700 px-2 py-0.5 rounded-full">
              {meetings.length}개 라운드
            </span>
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {showAll ? '요약 보기' : '전체 일정 보기'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayMeetings.map((meeting, idx) => {
            const originalIdx = showAll ? idx : Math.max(0, upcomingIdx - 2) + idx;
            return (
              <MeetingCard
                key={meeting.meeting_key}
                meeting={meeting}
                isUpcoming={originalIdx === upcomingIdx}
              />
            );
          })}
        </div>

        {meetings.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">시즌 일정이 아직 등록되지 않았습니다</p>
          </div>
        )}
      </div>

      {/* Latest Race Results */}
      <LatestRaceResults />
    </div>
  );
}
