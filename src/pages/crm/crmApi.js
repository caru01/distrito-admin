import { API_URL } from '../../config/api';
import { readApiJson } from '../../utils/http';

export function crmHeaders(json = false) {
  return {
    Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function crmRequest(path, options = {}) {
  const response = await fetch(`${API_URL}/admin/crm${path}`, {
    ...options,
    headers: { ...crmHeaders(options.body !== undefined), ...(options.headers || {}) },
  });
  const data = await readApiJson(response);
  if (!response.ok) {
    const error = new Error(data.error || 'No fue posible completar la operación CRM.');
    error.code = data.code;
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
