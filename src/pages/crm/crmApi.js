import { API_URL } from '../../config/api';
import { readApiJson } from '../../utils/http';

export function crmHeaders(json = false) {
  const token = sessionStorage.getItem('distrito_admin_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function crmRequest(path, options = {}) {
  let response = await fetch(`${API_URL}/admin/crm${path}`, {
    ...options,
    headers: { ...crmHeaders(options.body !== undefined), ...(options.headers || {}) },
  });

  // Si el token caducó, intentar renovar la sesión automáticamente
  if (response.status === 401 || response.status === 403) {
    const refreshToken =
      sessionStorage.getItem('distrito_admin_refresh_token') ||
      localStorage.getItem('distrito_admin_refresh_token');

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/admin/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshData = await refreshRes.json();
        if (refreshRes.ok && refreshData.token) {
          sessionStorage.setItem('distrito_admin_token', refreshData.token);
          // Reintentar la petición original con el nuevo token
          response = await fetch(`${API_URL}/admin/crm${path}`, {
            ...options,
            headers: {
              ...crmHeaders(options.body !== undefined),
              ...(options.headers || {}),
              Authorization: `Bearer ${refreshData.token}`,
            },
          });
        }
      } catch {
        // En caso de fallo de renovación, continuar al manejo regular
      }
    }
  }

  const data = await readApiJson(response);
  if (!response.ok) {
    const error = new Error(data.error || 'No fue posible completar la operación CRM.');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

export function crmJson(method, body, headers = {}) {
  return { method, body: JSON.stringify(body), headers };
}

export const CRM_STATUS_LABELS = {
  NUEVO_CONTACTO: 'Nuevo contacto', PROSPECTO: 'Prospecto', CLIENTE_NUEVO: 'Cliente nuevo',
  CLIENTE_RECURRENTE: 'Recurrente', CLIENTE_FRECUENTE: 'Frecuente', VIP: 'VIP',
  INACTIVO: 'Inactivo', RECUPERADO: 'Recuperado', NO_CONTACTAR: 'No contactar',
};

export const CRM_STATUS_OPTIONS = Object.keys(CRM_STATUS_LABELS);

export function crmStatusLabel(status) {
  return CRM_STATUS_LABELS[status] || status || 'Sin clasificar';
}

export function crmStatusTone(status) {
  if (['VIP','RECUPERADO'].includes(status)) return 'success';
  if (['CLIENTE_NUEVO','CLIENTE_RECURRENTE','CLIENTE_FRECUENTE'].includes(status)) return 'info';
  if (['INACTIVO','NO_CONTACTAR'].includes(status)) return 'danger';
  return 'warning';
}
