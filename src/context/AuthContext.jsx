import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AuthContext = createContext();

const AUTH_KEY = 'sr-studio-auth';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  });
  const [loading, setLoading] = useState(false);

  // 세션 복원 확인
  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const login = useCallback(async (password) => {
    setLoading(true);
    try {
      // 서버사이드 인증 (비밀번호 해싱 + RLS 보호)
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error || '비밀번호가 일치하지 않습니다.' };
      }
    } catch (err) {
      return { success: false, error: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback(async (currentPw, newPw) => {
    // 서버사이드 비밀번호 변경 (해시 처리)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change-password', currentPassword: currentPw, newPassword: newPw }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '비밀번호 변경에 실패했습니다.');
    }

    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// 인증 필수 라우트 래퍼
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
