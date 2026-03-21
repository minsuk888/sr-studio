import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AuthContext = createContext();

const USER_KEY = 'sr-studio-user';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // 세션 복원 확인
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(USER_KEY);
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      sessionStorage.removeItem(USER_KEY);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });

      const data = await res.json();

      if (data.success) {
        const user = data.user;
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        setCurrentUser(user);
        return { success: true, user };
      } else {
        return { success: false, error: data.error || '이름 또는 비밀번호가 일치하지 않습니다.' };
      }
    } catch (err) {
      return { success: false, error: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(USER_KEY);
    setCurrentUser(null);
  }, []);

  const changePassword = useCallback(async (memberId, currentPw, newPw) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'change-password',
        memberId,
        currentPassword: currentPw,
        newPassword: newPw,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '비밀번호 변경에 실패했습니다.');
    }

    return true;
  }, []);

  const isAuthenticated = currentUser !== null;
  const isAdmin = currentUser?.is_admin === true;

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, isAdmin, loading, login, logout, changePassword }}>
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
