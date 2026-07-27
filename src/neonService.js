import { API_URL } from "./config/api";

export async function fetchInitData() {
  try {
    const response = await fetch(`${API_URL}/init`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status === 'ok') {
      console.log(`✅ ${data.products.length} productos cargados.`);
      return data;
    }
    throw new Error(data.message || 'Error en respuesta');
  } catch (error) {
    console.error('❌ Error cargando datos:', error.message);
    return {
      status: 'ok',
      products: [],
      settings: { whatsapp_number: '', nequi_number: '', bancolombia_number: '' },
    };
  }
}
