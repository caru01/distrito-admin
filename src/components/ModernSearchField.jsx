import React, { useEffect, useId, useRef } from 'react';
import { Loader2, Search, X } from 'lucide-react';

function isEditableTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return target?.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
}

export default function ModernSearchField({
  value = '',
  onChange,
  label = 'Buscar',
  placeholder = 'Buscar…',
  helper = 'Busca en todos los datos disponibles.',
  loading = false,
  resultCount,
  resultLabel = 'resultados',
}) {
  const generatedId = useId();
  const inputId = `modern-search-${generatedId.replaceAll(':', '')}`;
  const inputRef = useRef(null);
  const hasValue = Boolean(value.trim());

  useEffect(() => {
    const focusSearch = (event) => {
      const commandK = event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey);
      const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey;
      if (!commandK && (!slash || isEditableTarget(event.target))) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  return (
    <div className={`modern-search ${hasValue ? 'is-active' : ''}`}>
      <div className="modern-search-control">
        <Search className="modern-search-icon" size={21} aria-hidden="true" />
        <label className="ds-sr-only" htmlFor={inputId}>{label}</label>
        <input
          ref={inputRef}
          id={inputId}
          className="modern-search-input"
          type="search"
          autoComplete="off"
          spellCheck="false"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <div className="modern-search-actions">
          {loading && <Loader2 className="modern-search-spinner" size={18} aria-label="Buscando" />}
          {hasValue ? (
            <button type="button" onClick={() => onChange('')} aria-label="Limpiar búsqueda" title="Limpiar búsqueda">
              <X size={17} />
            </button>
          ) : (
            <kbd aria-label="Atajo Control K">Ctrl K</kbd>
          )}
        </div>
      </div>
      <div className="modern-search-summary" aria-live="polite">
        <span>{hasValue ? <>Coincidencias para <strong>“{value.trim()}”</strong></> : helper}</span>
        {Number.isFinite(Number(resultCount)) && (
          <b>{Number(resultCount).toLocaleString('es-CO')} {Number(resultCount) === 1 ? resultLabel.replace(/s$/, '') : resultLabel}</b>
        )}
      </div>
    </div>
  );
}
