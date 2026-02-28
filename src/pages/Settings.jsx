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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { changePassword } = useAuth();
  const { tasks, members } = useApp();

  // ---- 비밀번호 변경 ----
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState(null); // { type: 'success'|'error', text }

  // ---- SNS 채널 수 ----
  const [channelCount, setChannelCount] = useState(0);

  useEffect(() => {
    supabase
      .from('sns_channels')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setChannelCount(count || 0))
      .catch(() => {});
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

  // ---- 통계 ----
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.status !== 'done').length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-brand-500" />
          관리자 설정
        </h1>
        <p className="text-sm text-slate-500 mt-1">시스템 설정 및 보안 관리</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 비밀번호 변경 */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-700">비밀번호 변경</h2>
              <p className="text-xs text-slate-400">접속 비밀번호를 변경합니다</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">현재 비밀번호</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                placeholder="현재 비밀번호 입력"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">새 비밀번호</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                placeholder="새 비밀번호 입력 (4자리 이상)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                placeholder="새 비밀번호 재입력"
              />
            </div>

            {pwMessage && (
              <div
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                  pwMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
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
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-700">앱 정보</h2>
                <p className="text-xs text-slate-400">SR Studio 시스템 현황</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                <span className="text-sm text-slate-500">버전</span>
                <span className="text-sm font-medium text-slate-700">SR Studio v1.0</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Supabase
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">연결됨</span>
              </div>
            </div>
          </div>

          {/* 데이터 현황 */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">데이터 현황</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-lg font-bold text-slate-700">{members.length}</p>
                  <p className="text-[11px] text-slate-400">팀원</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <ListChecks className="w-5 h-5 text-brand-500" />
                <div>
                  <p className="text-lg font-bold text-slate-700">{totalTasks}</p>
                  <p className="text-[11px] text-slate-400">전체 업무</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-lg font-bold text-slate-700">{completedTasks}</p>
                  <p className="text-[11px] text-slate-400">완료 업무</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-lg font-bold text-slate-700">{channelCount}</p>
                  <p className="text-[11px] text-slate-400">SNS 채널</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
