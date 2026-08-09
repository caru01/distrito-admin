import React, { useEffect, useState } from "react";
import {
  Check,
  Download,
  MessageCircle,
  Phone,
  ShieldOff,
  ShoppingBag,
  StickyNote,
  Tag,
  User as UserRound,
  X,
} from "lucide-react";
import ModernSearchField from "../../components/ModernSearchField";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { API_URL } from "../../config/api";
import {
  crmHeaders,
  crmJson,
  crmRequest,
  CRM_STATUS_OPTIONS,
  crmStatusLabel,
  crmStatusTone,
} from "./crmApi";

const EMPTY_FILTERS = { search: "", status: "", source: "" };

function ContactDetail({ id, close, notify, refresh }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [note, setNote] = useState("");
  const [sensitiveNote, setSensitiveNote] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagId, setTagId] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try {
      const [response, tagsResponse] = await Promise.all([
        crmRequest(`/contacts/${id}`),
        crmRequest("/tags"),
      ]);
      setData(response);
      setForm(response.contact);
      setAvailableTags(tagsResponse.tags || []);
    } catch (error) {
      notify("error", error.message);
    }
  };
  useEffect(() => {
    load();
  }, [id]);
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await crmRequest(`/contacts/${id}`, crmJson("PUT", form));
      notify("success", "Contacto actualizado.");
      await load();
      refresh();
    } catch (error) {
      notify("error", error.message);
    } finally {
      setSaving(false);
    }
  };
  const consent = async (granted) => {
    try {
      await crmRequest(
        `/contacts/${id}/consent`,
        crmJson("POST", {
          granted,
          source: "ADMIN_EXPLICIT",
          reason: granted ? "" : "Solicitud registrada desde el CRM",
        }),
      );
      notify(
        "success",
        granted
          ? "Consentimiento registrado."
          : "El contacto quedó excluido de campañas.",
      );
      await load();
      refresh();
    } catch (error) {
      notify("error", error.message);
    }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    try {
      await crmRequest(
        `/contacts/${id}/notes`,
        crmJson("POST", { body: note, is_sensitive: sensitiveNote }),
      );
      setNote("");
      setSensitiveNote(false);
      await load();
      notify("success", "Nota agregada.");
    } catch (error) {
      notify("error", error.message);
    }
  };
  const addTag = async () => {
    if (!tagId) return;
    try {
      await crmRequest(
        `/contacts/${id}/tags`,
        crmJson("POST", { tag_id: Number(tagId) }),
      );
      setTagId("");
      await load();
      notify("success", "Etiqueta asignada.");
    } catch (error) {
      notify("error", error.message);
    }
  };
  const removeTag = async (currentTagId) => {
    try {
      await crmRequest(`/contacts/${id}/tags/${currentTagId}`, {
        method: "DELETE",
        headers: crmHeaders(),
      });
      await load();
    } catch (error) {
      notify("error", error.message);
    }
  };
  if (!data)
    return (
      <div className="ds-modal-overlay">
        <div className="ds-modal">
          <div className="ds-loader-container">
            <div className="ds-loader" />
            <p>Cargando perfil 360°…</p>
          </div>
        </div>
      </div>
    );
  const contact = data.contact;
  return (
    <div
      className="ds-modal-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div
        className="ds-modal ds-modal-xl crm-contact-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="ds-modal-header">
          <div>
            <span className="ds-page-kicker">Perfil CRM 360°</span>
            <h2 className="ds-modal-title">
              {contact.display_name || contact.normalized_phone}
            </h2>
          </div>
          <button className="ds-modal-close" onClick={close}>
            <X />
          </button>
        </div>
        <div className="ds-modal-body crm-contact-detail">
          <section className="crm-contact-main">
            <form className="ds-form" onSubmit={save}>
              <div className="ds-form-grid">
                <label className="ds-form-group">
                  <span className="ds-form-label">Nombre</span>
                  <input
                    className="ds-input"
                    value={form.display_name || ""}
                    onChange={(event) =>
                      setForm({ ...form, display_name: event.target.value })
                    }
                  />
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Correo</span>
                  <input
                    className="ds-input"
                    type="email"
                    value={form.email || ""}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Estado comercial</span>
                  <select
                    className="ds-select"
                    value={form.status || ""}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                  >
                    {CRM_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {crmStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Fuente</span>
                  <select
                    className="ds-select"
                    value={form.source || "OTRO"}
                    onChange={(event) =>
                      setForm({ ...form, source: event.target.value })
                    }
                  >
                    {[
                      "WHATSAPP",
                      "INSTAGRAM",
                      "FACEBOOK",
                      "GOOGLE",
                      "TIENDA_DIRECTA",
                      "PRESENCIAL",
                      "QR",
                      "CAMPANA",
                      "MANUAL",
                      "OTRO",
                    ].map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Barrio</span>
                  <input
                    className="ds-input"
                    value={form.barrio || ""}
                    onChange={(event) =>
                      setForm({ ...form, barrio: event.target.value })
                    }
                  />
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Teléfono canónico</span>
                  <input
                    className="ds-input"
                    value={contact.normalized_phone}
                    disabled
                  />
                </label>
              </div>
              <label className="ds-form-group">
                <span className="ds-form-label">Dirección</span>
                <input
                  className="ds-input"
                  value={form.address || ""}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </label>
              <button className="ds-btn ds-btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar perfil"}
              </button>
            </form>
            <div className="crm-consent-card">
              <div>
                <strong>Consentimiento comercial</strong>
                <p>
                  {contact.marketing_opt_in && !contact.marketing_opt_out
                    ? "Puede recibir campañas por WhatsApp."
                    : "No participa en campañas comerciales."}
                </p>
              </div>
              <div>
                {contact.marketing_opt_in && !contact.marketing_opt_out ? (
                  <button
                    className="ds-btn ds-btn-danger ds-btn-sm"
                    onClick={() => consent(false)}
                  >
                    <ShieldOff size={16} /> No contactar
                  </button>
                ) : (
                  <button
                    className="ds-btn ds-btn-success ds-btn-sm"
                    onClick={() => consent(true)}
                  >
                    <Check size={16} /> Registrar opt-in
                  </button>
                )}
              </div>
            </div>
            <div className="crm-note-editor">
              <h3>
                <StickyNote size={18} /> Nota interna
              </h3>
              <textarea
                className="ds-textarea"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Preferencias, contexto comercial o próxima acción…"
              />
              <label className="ds-check">
                <input
                  type="checkbox"
                  checked={sensitiveNote}
                  onChange={(event) => setSensitiveNote(event.target.checked)}
                />
                <span>Nota sensible (queda auditada)</span>
              </label>
              <button
                className="ds-btn ds-btn-secondary ds-btn-sm"
                onClick={addNote}
              >
                Agregar nota
              </button>
            </div>
            <div className="crm-tag-editor">
              <h3>
                <Tag size={18} /> Etiquetas
              </h3>
              <div className="crm-tag-list">
                {contact.tags?.map((tag) => (
                  <span
                    key={tag.id}
                    className="ds-badge"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    {tag.name}
                    <button
                      aria-label={`Quitar ${tag.name}`}
                      onClick={() => removeTag(tag.id)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="crm-tag-picker">
                <select
                  className="ds-select"
                  value={tagId}
                  onChange={(event) => setTagId(event.target.value)}
                >
                  <option value="">Seleccionar etiqueta</option>
                  {availableTags
                    .filter(
                      (tag) =>
                        !contact.tags?.some(
                          (assigned) => assigned.id === tag.id,
                        ),
                    )
                    .map((tag) => (
                      <option value={tag.id} key={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                </select>
                <button
                  className="ds-btn ds-btn-secondary ds-btn-sm"
                  disabled={!tagId}
                  onClick={addTag}
                >
                  Asignar
                </button>
              </div>
            </div>
            <div className="crm-timeline">
              <h3>Timeline unificado</h3>
              {[
                ...(data.notes || []).map((item) => ({
                  ...item,
                  occurred_at: item.created_at,
                  summary: item.body,
                  activity_type: "NOTE",
                })),
                ...(data.activity || []),
              ]
                .sort(
                  (a, b) => new Date(b.occurred_at) - new Date(a.occurred_at),
                )
                .slice(0, 60)
                .map((item) => (
                  <article key={`${item.activity_type}-${item.id}`}>
                    <span>
                      {item.activity_type === "NOTE" ? (
                        <StickyNote size={14} />
                      ) : (
                        <Check size={14} />
                      )}
                    </span>
                    <div>
                      <strong>{item.summary}</strong>
                      <small>{formatDateTime(item.occurred_at)}</small>
                    </div>
                  </article>
                ))}
            </div>
          </section>
          <aside className="crm-contact-aside">
            <div className="crm-profile-metrics">
              <article>
                <ShoppingBag />
                <strong>{contact.orders_count}</strong>
                <span>Pedidos</span>
              </article>
              <article>
                <UserRound />
                <strong>{formatCurrency(contact.total_spent)}</strong>
                <span>Total comprado</span>
              </article>
              <article>
                <MessageCircle />
                <strong>{data.conversations.length}</strong>
                <span>Conversaciones</span>
              </article>
              <article>
                <Tag />
                <strong>{contact.tags?.length || 0}</strong>
                <span>Etiquetas</span>
              </article>
            </div>
            <div className="crm-contact-actions">
              <a
                className="ds-btn ds-btn-success"
                href={`https://wa.me/${contact.normalized_phone.slice(1)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle /> WhatsApp
              </a>
              <a
                className="ds-btn ds-btn-secondary"
                href={`tel:${contact.normalized_phone}`}
              >
                <Phone /> Llamar
              </a>
            </div>
            {data.favorite_products?.length ? (
              <div className="crm-favorite-products">
                <h3>Productos preferidos</h3>
                {data.favorite_products.map((item) => (
                  <div key={item.product}>
                    <span>{item.product}</span>
                    <strong>{item.quantity} uds.</strong>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="customer-order-history">
              <h3>Pedidos conectados</h3>
              {data.orders.length ? (
                data.orders.map((order) => (
                  <article key={order.id}>
                    <div>
                      <strong>#{order.id}</strong>
                      <span className="ds-badge ds-badge-neutral">
                        {order.status}
                      </span>
                    </div>
                    <p>
                      {formatDateTime(order.created_at)} · {order.source}
                    </p>
                    <b>{formatCurrency(order.total)}</b>
                  </article>
                ))
              ) : (
                <p className="ds-text-muted">Todavía no ha comprado.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function CrmContacts({ revision, notify }) {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const load = async (page = 1) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page, limit: 25, ...filters });
      const data = await crmRequest(`/contacts?${query}`);
      setContacts(data.contacts);
      setPagination(data.pagination);
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => load(1), 250);
    return () => clearTimeout(timer);
  }, [filters, revision]);
  const exportCsv = async () => {
    try {
      const query = new URLSearchParams(filters);
      const response = await fetch(`${API_URL}/admin/crm/export.csv?${query}`, {
        headers: crmHeaders(),
      });
      if (!response.ok) throw new Error("No fue posible exportar el CRM.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "crm-distritobg.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notify("error", error.message);
    }
  };
  return (
    <>
      <section className="ds-card crm-directory">
        <div className="crm-contact-toolbar">
          <ModernSearchField
            value={filters.search}
            onChange={(search) => setFilters((current) => ({ ...current, search }))}
            placeholder="Nombre, teléfono, correo, barrio o pedido"
            helper="Busca en el perfil 360°, el teléfono o el historial de pedidos."
            loading={loading}
            resultCount={pagination.total}
            resultLabel="contactos"
          />
          <select
            className="ds-select"
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value })
            }
          >
            <option value="">Todos los estados</option>
            {CRM_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {crmStatusLabel(status)}
              </option>
            ))}
          </select>
          <select
            className="ds-select"
            value={filters.source}
            onChange={(event) =>
              setFilters({ ...filters, source: event.target.value })
            }
          >
            <option value="">Todas las fuentes</option>
            {[
              "WHATSAPP",
              "TIENDA_DIRECTA",
              "PRESENCIAL",
              "MANUAL",
              "GOOGLE",
              "INSTAGRAM",
              "FACEBOOK",
              "QR",
              "CAMPANA",
              "OTRO",
            ].map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
          <button className="ds-btn ds-btn-secondary" onClick={exportCsv}>
            <Download size={17} /> Exportar
          </button>
        </div>
        {loading ? (
          <div className="ds-loader-container">
            <div className="ds-loader" />
            <p>Cargando contactos…</p>
          </div>
        ) : contacts.length ? (
          <>
            <div className="ds-table-container crm-contact-table">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th>Fuente</th>
                    <th>Última compra</th>
                    <th>Pedidos</th>
                    <th>Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>
                        <div className="customer-name">
                          <span>
                            {contact.display_name?.[0]?.toUpperCase() || "?"}
                          </span>
                          <div>
                            <strong>
                              {contact.display_name || "Sin nombre"}
                            </strong>
                            <small>
                              {contact.normalized_phone} ·{" "}
                              {contact.barrio || "Sin barrio"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`ds-badge ds-badge-${crmStatusTone(contact.status)}`}
                        >
                          {crmStatusLabel(contact.status)}
                        </span>
                      </td>
                      <td>{contact.source.replaceAll("_", " ")}</td>
                      <td>{formatDateTime(contact.last_purchase_at)}</td>
                      <td>{contact.orders_count}</td>
                      <td>
                        <strong>{formatCurrency(contact.total_spent)}</strong>
                      </td>
                      <td>
                        <button
                          className="ds-btn ds-btn-ghost ds-btn-sm"
                          onClick={() => setSelected(contact.id)}
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="crm-contact-cards">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelected(contact.id)}
                >
                  <div className="customer-name">
                    <span>
                      {contact.display_name?.[0]?.toUpperCase() || "?"}
                    </span>
                    <div>
                      <strong>{contact.display_name || "Sin nombre"}</strong>
                      <small>{contact.normalized_phone}</small>
                    </div>
                  </div>
                  <span
                    className={`ds-badge ds-badge-${crmStatusTone(contact.status)}`}
                  >
                    {crmStatusLabel(contact.status)}
                  </span>
                  <dl>
                    <div>
                      <dt>Pedidos</dt>
                      <dd>{contact.orders_count}</dd>
                    </div>
                    <div>
                      <dt>Valor</dt>
                      <dd>{formatCurrency(contact.total_spent)}</dd>
                    </div>
                  </dl>
                </button>
              ))}
            </div>
            <footer className="customer-pagination">
              <span>{pagination.total} contactos</span>
              <div>
                <button
                  className="ds-btn ds-btn-secondary ds-btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => load(pagination.page - 1)}
                >
                  Anterior
                </button>
                <strong>
                  {pagination.page} / {pagination.pages}
                </strong>
                <button
                  className="ds-btn ds-btn-secondary ds-btn-sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => load(pagination.page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="ds-empty-state">
            <UserRound />
            <h3>No hay contactos con estos filtros</h3>
            <p>Prueba otra búsqueda o espera la siguiente conversación.</p>
          </div>
        )}
      </section>
      {selected && (
        <ContactDetail
          id={selected}
          close={() => setSelected(null)}
          notify={notify}
          refresh={() => load(pagination.page)}
        />
      )}
    </>
  );
}
