import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Lock,
  Shield,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader,
  Users,
  ListChecks,
  BarChart3,
  Database,
  Sparkles,
  LogIn,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

const FEATURE_LABELS = {
  dashboard: '대시보드',
  tasks: '업무 관리',
  calendar: '캘린더',
  kpi: 'KPI',
  news: '뉴스 스크랩',
  sns: 'SNS 분석',
  meetings: '회의록',
  'youtube-comments': '댓글 분석',
};

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

export default function Settings() {
  const { changePassword } = useAuth();
  const { tasks, members } = useApp();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);

  const [channelCount, setChannelCount] = useState(0);
  const [aiUsage, setAiUsage] = useState({ used: 0, limit: 30 });
  const [aiLogs, setAiLogs] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('sns_channels')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setChannelCount(count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchLogs() {
      setLogsLoading(true);
      try {
        const [aiRes, loginRes] = await Promise.all([
          fetch('/api/auth?type=ai_call&limit=10'),
          fetch('/api/auth?type=login&limit=15'),
        ]);

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiUsage(aiData.todayAiUsage || { used: 0, limit: 30 });
          setAiLogs(aiData.logs || []);
        }

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          setAccessLogs(loginData.logs || []);
        }
      } catch {
        // 로그 조회 실패 시 무시
      } finally {
        setLogsLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(null);

    if (!currentPw || !newPw || !confirmPw) {
      setPwMessage({ type: 'error', text: '모든 필드를 입력해주세요.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (newPw.length < 4) {
      setPwMessage({ type: 'error', text: '비밀번호는 최소 4자리 이상이어야 합니다.' });
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMessage({ type: 'error', text: err.message });
    } finally {
      setPwLoading(false);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const usagePercent = aiUsage.limit > 0 ? Math.min((aiUsage.used / aiUsage.limit) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-brand-500" />
          관리자 설정
        </h1>
        <p className="text-sm text-gray-400 mt-1">시스템 설정 및 보안 관리</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 비밀번호 변경 */}
        <div className="bg-surface-800 rounded-xl shadow-sm p-6 border border-surface-700">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-300">비밀번호 변경</h2>
              <p className="text-xs text-gray-500">접속 비밀번호를 변경합니다</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">현재 비밀번호</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                placeholder="현재 비밀번호 입력"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">새 비밀번호</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                placeholder="새 비밀번호 입력 (4자리 이상)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-700 bg-surface-900 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                placeholder="새 비밀번호 재입력"
              />
            </div>

            {pwMessage && (
              <div
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                  pwMessage.type === 'success'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {pwMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {pwMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {pwLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  변경 중...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  비밀번호 변경
                </>
              )}
            </button>
          </form>
        </div>

        {/* 앱 정보 */}
        <div className="space-y-6">
          <div className="bg-surface-800 rounded-xl shadow-sm p-6 border border-surface-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-300">앱 정보</h2>
                <p className="text-xs text-gray-500">SR Studio 시스템 현황</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 border-b border-surface-700">
                <span className="text-sm text-gray-400">버전</span>
                <span className="text-sm font-medium text-gray-300">SR Studio v1.0</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-surface-700">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Supabase
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">연결됨</span>
              </div>
            </div>
          </div>

          {/* 데이터 현황 */}
          <div className="bg-surface-800 rounded-xl shadow-sm p-6 border border-surface-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">데이터 현황</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-surface-700 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-lg font-bold text-gray-300">{members.length}</p>
                  <p className="text-[11px] text-gray-500">팀원</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-700 rounded-lg">
                <ListChecks className="w-5 h-5 text-brand-500" />
                <div>
                  <p className="text-lg font-bold text-gray-300">{totalTasks}</p>
                  <p className="text-[11px] text-gray-500">전체 업무</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-700 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-lg font-bold text-gray-300">{completedTasks}</p>
                  <p className="text-[11px] text-gray-500">완료 업무</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-700 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-lg font-bold text-gray-300">{channelCount}</p>
                  <p className="text-[11px] text-gray-500">SNS 채널</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI 사용량 + 접속 로그 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI 사용량 */}
        <div className="bg-surface-800 rounded-xl shadow-sm p-6 border border-surface-700">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-300">AI 분석 사용량</h2>
              <p className="text-xs text-gray-500">일일 {aiUsage.limit}회 제한</p>
            </div>
          </div>

          {/* 프로그레스 바 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">오늘 사용량</span>
              <span className={`text-sm font-bold ${usagePercent >= 100 ? 'text-red-400' : usagePercent >= 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                {aiUsage.used} / {aiUsage.limit}
              </span>
            </div>
            <div className="w-full bg-surface-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          {/* 최근 AI 호출 내역 */}
          {logsLoading ? (
            <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
              <Loader className="w-4 h-4 animate-spin mr-2" /> 로딩 중...
            </div>
          ) : aiLogs.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 mb-2">최근 호출 내역</p>
              {aiLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-surface-700/50 text-xs">
                  <span className="text-gray-400">{formatDate(log.created_at)}</span>
                  <span className="text-gray-300 font-medium">
                    {FEATURE_LABELS[log.feature] || log.feature}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-3">오늘 AI 호출 내역이 없습니다.</p>
          )}
        </div>

        {/* 접속 로그 */}
        <div className="bg-surface-800 rounded-xl shadow-sm p-6 border border-surface-700">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <LogIn className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-300">접속 로그</h2>
              <p className="text-xs text-gray-500">최근 로그인 기록</p>
            </div>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
              <Loader className="w-4 h-4 animate-spin mr-2" /> 로딩 중...
            </div>
          ) : accessLogs.length > 0 ? (
            <div className="space-y-1.5">
              {accessLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-surface-700/50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{formatDate(log.created_at)}</span>
                    {(log.ip || log.location) && (
                      <span className="text-gray-500">
                        {[log.location, log.ip].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  {log.type === 'login' ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-3 h-3" /> 성공
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircle className="w-3 h-3" /> 실패
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-3">접속 기록이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
