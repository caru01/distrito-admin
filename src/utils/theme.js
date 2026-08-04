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
}
