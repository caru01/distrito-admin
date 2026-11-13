import { API_URL } from '../config/api';

export async function readApiJson(response) {
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(
      response.ok
        ? 'El servidor respondió con un formato inesperado. Verifica la URL de la API.'
        : `La API no está disponible en esta dirección (HTTP ${response.status}).`,
    );
  }

  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('La API devolvió una respuesta JSON inválida.');
  }
}

let pendingRefreshPromise = null;

export async function refreshAdminSession() {
  if (pendingRefreshPromise) return pendingRefreshPromise;

  const refreshToken =
    sessionStorage.getItem('distrito_admin_refresh') ||
    localStorage.getItem('distrito_admin_refresh') ||
    sessionStorage.getItem('distrito_admin_refresh_token') ||
    localStorage.getItem('distrito_admin_refresh_token');

  if (!refreshToken) {
    throw new Error('No hay credencial de renovación activa.');
  }

  pendingRefreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/admin/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await response.json();
      if (!response.ok || !data.token) {
        throw new Error(data.error || 'La sesión expiró.');
      }
      sessionStorage.setItem('distrito_admin_token', data.token);
      return data.token;
    } finally {
      pendingRefreshPromise = null;
    }
  })();

  return pendingRefreshPromise;
}

export async function authFetch(url, options = {}) {
  let token = sessionStorage.getItem('distrito_admin_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response = await fetch(url, { ...options, headers });

  // Si el token es inválido o expiró (401 o 403), intentar renovación automática transparente
  if (response.status === 401 || response.status === 403) {
    try {
      const newToken = await refreshAdminSession();
      if (newToken) {
        const retryHeaders = {
          ...(options.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      }
    } catch {
      // Si la renovación falló, se mantiene el response para manejo de cierre de sesión
    }
  }

  return response;
}
