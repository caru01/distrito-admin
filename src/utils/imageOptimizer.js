/**
 * Utilidad para optimizar y comprimir imágenes en el navegador antes de enviarlas al servidor.
 * Evita errores de "Failed to fetch" o "413 Payload Too Large" por límites de Nginx / proxy,
 * y acelera la carga para los clientes finales en la tienda pública.
 */

export async function optimizeImageFile(file, options = {}) {
  const {
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.82,
    preferredFormat = 'image/webp',
    fallbackFormat = 'image/jpeg',
  } = options;

  if (!file) throw new Error('No se proporcionó ningún archivo.');
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  // Si es un GIF animado o SVG, no procesar por canvas para no perder animación o vectorización
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Los archivos GIF o SVG no deben superar los 2 MB.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo de imagen está dañado o no es compatible.'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Redimensionar manteniendo proporción si excede los límites máximos
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback si canvas 2d no está disponible
            return resolve(e.target.result);
          }

          // Filtro bicúbico de alta calidad
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Dibujar en el canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Intentar exportar a WebP
          let dataUrl = canvas.toDataURL(preferredFormat, quality);

          // Si el navegador no soporta exportar al formato preferido (ej. Safari antiguo con WebP)
          if (!dataUrl.startsWith(`data:${preferredFormat}`)) {
            dataUrl = canvas.toDataURL(fallbackFormat, quality);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
