import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../config/api';
import { applyAdminTheme } from '../utils/theme';

export const AuthContext = createContext();

const ACCESS_KEY = 'distrito_admin_token';
const REFRESH_KEY = 'distrito_admin_refresh';
const PROFILE_KEY = 'distrito_user_profile';
const STALE_AUTH_OPERATION = 'STALE_AUTH_OPERATION';

function staleAuthOperation() {
  const error = new Error('La operación de sesión fue reemplazada');
  error.code = STALE_AUTH_OPERATION;
  return error;
}

function tokenExpiresAt(token) {
  try {
    let payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    payload += '='.repeat((4 - (payload.length % 4)) % 4);
    return Number(JSON.parse(atob(payload)).exp) * 1000;
  }
  catch { return 0; }
}

function storedRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY);
}

export function getDeviceIdentity() {
  let deviceId = localStorage.getItem('distrito_device_id');
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('distrito_device_id', deviceId);
  }
  const platform = navigator.userAgentData?.platform || navigator.platform || 'Dispositivo';
  const browser = /Edg\//.test(navigator.userAgent) ? 'Edge' : /Firefox\//.test(navigator.userAgent) ? 'Firefox' : /Chrome\//.test(navigator.userAgent) ? 'Chrome' : /Safari\//.test(navigator.userAgent) ? 'Safari' : 'Navegador';
  return { deviceId, deviceName: `${browser} · ${platform}` };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const refreshPromise = useRef(null);
  const authRevision = useRef(0);
  const lastActivity = useRef(Date.now());

  const clearAuth = useCallback((reason = '', expectedRevision = null) => {
    if (expectedRevision !== null && expectedRevision !== authRevision.current) return false;
    authRevision.current += 1;
    refreshPromise.current = null;
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(PROFILE_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    if (reason) sessionStorage.setItem('distrito_session_notice', reason);
    setUser(null);
    setPermissions([]);
    setIsAuthenticated(false);
    return true;
  }, []);

  const acceptAuth = useCallback((data, expectedRevision = null) => {
    if (expectedRevision !== null && expectedRevision !== authRevision.current) return false;
    const currentUser = { ...(data.user || {}), permissions: data.permissions || [] };
    if (data.token) sessionStorage.setItem(ACCESS_KEY, data.token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(currentUser));
    setUser(currentUser);
    setPermissions(data.permissions || []);
    setIsAuthenticated(true);
    lastActivity.current = Date.now();
    return true;
  }, []);

  const refreshSession = useCallback(async () => {
    const revision = authRevision.current;
    if (refreshPromise.current?.revision === revision) return refreshPromise.current.promise;
    const refreshToken = storedRefreshToken();
    if (!refreshToken) throw new Error('No hay credencial de renovación');
    let request;
    request = fetch(`${API_URL}/admin/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.token) throw new Error(data.error || 'La sesión caducó');
      if (revision !== authRevision.current) throw staleAuthOperation();
      acceptAuth(data, revision);
      return data.token;
    }).finally(() => {
      if (refreshPromise.current?.promise === request) refreshPromise.current = null;
    });
    refreshPromise.current = { revision, promise: request };
    return request;
  }, [acceptAuth]);

  const verifySession = useCallback(async () => {
    const revision = authRevision.current;
    let token = sessionStorage.getItem(ACCESS_KEY);
    if (!token && !storedRefreshToken()) {
      clearAuth('', revision);
      return false;
    }
    try {
      if (!token || tokenExpiresAt(token) <= Date.now()) token = await refreshSession();
      const response = await fetch(`${API_URL}/admin/verify`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401 || response.status === 403) {
        token = await refreshSession();
        const retry = await fetch(`${API_URL}/admin/verify`, { headers: { Authorization: `Bearer ${token}` } });
        const retryData = await retry.json();
        if (!retry.ok) throw new Error(retryData.error || 'La sesión caducó');
        if (revision !== authRevision.current) return false;
        acceptAuth(retryData, revision);
        return true;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'La sesión no es válida');
      if (revision !== authRevision.current) return false;
      acceptAuth(data, revision);
      return true;
    } catch (error) {
      if (error?.code === STALE_AUTH_OPERATION || revision !== authRevision.current) return false;
      clearAuth(error.message || 'Tu sesión caducó por inactividad.', revision);
      return false;
    }
  }, [acceptAuth, clearAuth, refreshSession]);

  const refreshSettings = useCallback(async () => {
    const token = sessionStorage.getItem(ACCESS_KEY);
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok && data.settings) {
        setSettings(data.settings);
        applyAdminTheme(data.settings);
      }
    } catch { /* La sesión sigue disponible aunque falle la identidad visual. */ }
  }, []);

  useEffect(() => {
    verifySession().finally(() => setLoading(false));
  }, [verifySession]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    refreshSettings();
    const onSettingsUpdated = () => refreshSettings();
    window.addEventListener('distrito:settings-updated', onSettingsUpdated);
    return () => window.removeEventListener('distrito:settings-updated', onSettingsUpdated);
  }, [isAuthenticated, refreshSettings]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let lastRecorded = 0;
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 1000) {
        lastRecorded = now;
        lastActivity.current = now;
      }
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    const timer = window.setInterval(async () => {
      const idleMinutes = Number(user?.session_idle_minutes) || 60;
      if (Date.now() - lastActivity.current >= idleMinutes * 60_000) {
        clearAuth(`Tu sesión caducó después de ${idleMinutes} minutos sin actividad.`);
        return;
      }
      const token = sessionStorage.getItem(ACCESS_KEY);
      if (!token || tokenExpiresAt(token) - Date.now() < 120_000) {
        const revision = authRevision.current;
        try { await refreshSession(); }
        catch (error) {
          if (error?.code !== STALE_AUTH_OPERATION) clearAuth(error.message, revision);
        }
      }
    }, 60_000);
    const verifyOnReturn = () => { if (document.visibilityState === 'visible') verifySession(); };
    document.addEventListener('visibilitychange', verifyOnReturn);
    window.addEventListener('focus', verifyOnReturn);
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      document.removeEventListener('visibilitychange', verifyOnReturn);
      window.removeEventListener('focus', verifyOnReturn);
    };
  }, [clearAuth, isAuthenticated, refreshSession, user?.session_idle_minutes, verifySession]);

  const login = (token, userData, refreshToken, remember = false) => {
    authRevision.current += 1;
    refreshPromise.current = null;
    sessionStorage.setItem(REFRESH_KEY, refreshToken);
    if (remember) localStorage.setItem(REFRESH_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
    acceptAuth({ token, user: userData, permissions: userData.permissions || [] }, authRevision.current);
    setLoading(false);
  };

  const logout = () => clearAuth();

  const hasPermission = (module, action) => {
    if (!user) return false;
    if (['Admin', 'Administrador', 'Super Administrador', 'super_admin'].includes(user.role || user.role_name || '')) return true;
    return permissions.includes(`${module}:${action}`);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, settings, isAuthenticated, loading, login, logout, hasPermission, verifySession, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
};
