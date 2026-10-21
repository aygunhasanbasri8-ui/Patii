import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import * as api from '../lib/api';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_NAME_KEY = 'auth_user_name';
const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_KEYS = [AUTH_TOKEN_KEY, AUTH_USER_NAME_KEY, AUTH_USER_ID_KEY];

export function useAuth() {
  const [authToken, setAuthToken] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  const restore = useCallback(async () => {
    const [t, n, id] = await Promise.all(AUTH_KEYS.map((key) => AsyncStorage.getItem(key)));
    if (t && id) {
      setAuthToken(t);
      setUserName(n || '');
      setUserId(id);
      return { token: t, userId: id };
    }
    return null;
  }, []);

  const persistSession = useCallback(async (token, name, id) => {
    setAuthToken(token);
    setUserName(name);
    setUserId(id);
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
      AsyncStorage.setItem(AUTH_USER_NAME_KEY, name || ''),
      AsyncStorage.setItem(AUTH_USER_ID_KEY, id),
    ]);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    const token = data.access_token || '';
    const id = String(data.user_id || '');
    await persistSession(token, data.user_name || '', id);
    return { token, userId: id };
  }, [persistSession]);

  const register = useCallback(
    async (full_name, email, password) => api.register({ full_name, email, password }),
    []
  );

  const logout = useCallback(async () => {
    await Promise.all(AUTH_KEYS.map((key) => AsyncStorage.removeItem(key)));
    setAuthToken('');
    setUserName('');
    setUserId('');
  }, []);

  return { authToken, userName, userId, restore, login, register, logout };
}
