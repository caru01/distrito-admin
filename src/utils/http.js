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
