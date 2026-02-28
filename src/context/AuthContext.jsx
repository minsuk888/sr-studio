import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'password')
        .single();

      if (error) throw new Error('설정을 불러올 수 없습니다.');

      if (data.value === password) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: '비밀번호가 일치하지 않습니다.' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback(async (currentPw, newPw) => {
    // 현재 비밀번호 확인
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'password')
      .single();

    if (error) throw new Error('설정을 불러올 수 없습니다.');
    if (data.value !== currentPw) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }

    // 새 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('app_settings')
      .update({ value: newPw })
      .eq('key', 'password');

    if (updateError) throw new Error('비밀번호 변경에 실패했습니다.');
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
