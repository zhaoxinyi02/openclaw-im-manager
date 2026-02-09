import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('admin-token') || '');

  const login = useCallback(async (password: string) => {
    const res = await api.login(password);
    if (res.ok) {
      localStorage.setItem('admin-token', res.token);
      setToken(res.token);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin-token');
    setToken('');
  }, []);

  return { token, isLoggedIn: !!token, login, logout };
}
