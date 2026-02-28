import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Lock, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setError('');
    const result = await login(password);

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div
        className={`relative w-full max-w-sm transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
      >
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <Flag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">SR STUDIO</h1>
          <p className="text-sm text-slate-400 mt-1 tracking-widest">MARKETING TOOL</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-300">비밀번호를 입력해주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoFocus
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-center text-lg tracking-[0.3em] placeholder:text-slate-500 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>

        {/* 하단 텍스트 */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Super Race Marketing Management System
        </p>
      </div>

      {/* shake 애니메이션 */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
