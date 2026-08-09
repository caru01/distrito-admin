const HEX = /^#[0-9A-Fa-f]{6}$/;

export function applyAdminTheme(settings = {}) {
  const root = document.documentElement;
  const values = {
    '--ds-primary': settings.admin_primary_color,
    '--ds-bg-base': settings.admin_background_color,
    '--ds-bg-surface': settings.admin_surface_color,
    '--ds-text-primary': settings.admin_text_color,
  };
  Object.entries(values).forEach(([property, value]) => {
    if (HEX.test(String(value || ''))) root.style.setProperty(property, value);
  });
  const fonts = {
    modern: "'Inter', 'Montserrat', sans-serif",
    friendly: "'Poppins', 'Nunito', sans-serif",
    classic: "Georgia, 'Times New Roman', serif",
    system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  };
  root.style.setProperty('--ds-font', fonts[settings.admin_font_family] || fonts.modern);
  root.dataset.adminDensity = settings.admin_density || 'comfortable';
  document.title = settings.admin_page_title || 'Distrito BG Admin';
}
