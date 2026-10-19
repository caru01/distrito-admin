import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  Check,
  CheckCheck,
  Clock3,
  ExternalLink,
  FileText,
  Headphones,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Mic,
  Package,
  Phone,
  RefreshCw,
  Save,
  Search,
  PlusCircle,
  Send,
  ShoppingBag,
  Sparkles,
  StickyNote,
  User as UserRound,
  Video,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  CRM_STATUS_OPTIONS,
  crmJson,
  crmRequest,
  crmStatusLabel,
  crmStatusTone,
} from './crmApi';

const CrmOrderComposer = React.lazy(() => import('./CrmOrderComposer'));

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatConversationDateShort(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const fmtDay = (d) =>
    d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const todayStr = fmtDay(new Date());
  const msgDayStr = fmtDay(date);
  if (msgDayStr === todayStr) return formatMessageTime(value);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (msgDayStr === fmtDay(yesterday)) return 'Ayer';

  return date.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatDateDivider(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const fmtDay = (d) =>
    d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const todayStr = fmtDay(new Date());
  const msgDayStr = fmtDay(date);
  if (msgDayStr === todayStr) return 'Hoy';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (msgDayStr === fmtDay(yesterday)) return 'Ayer';

  return date.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getBogotaDayKey(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

function getContactSubtitle(item) {
  if (!item) return '';
  if (
    item.bsuid === 'CONSUMIDOR_FINAL' ||
    item.bsuid === '2222222' ||
    item.normalized_phone === '+572222222'
  ) {
    return '2222222 · Venta mostrador / POS';
  }
  if (item.normalized_phone) return item.normalized_phone;
  if (item.username) return `@${String(item.username).replace(/^@/, '')}`;
  if (item.bsuid) return `ID WhatsApp: ${String(item.bsuid).slice(0, 14)}…`;
  return 'Sin teléfono visible';
}

function getLastMessagePreview(item) {
  if (!item) return 'Sin mensajes';
  const txt = String(item.last_message_text || '').trim();
  const type = String(item.last_message_type || '').toLowerCase();
  if (txt && !['[image]', '[audio]', '[video]', '[document]', '[sticker]', '[location]'].includes(txt.toLowerCase())) {
    return txt;
  }
  switch (type) {
    case 'image':
      return '📷 Foto';
    case 'audio':
      return '🎤 Nota de voz / Audio';
    case 'video':
      return '🎥 Video';
    case 'document':
      return '📄 Documento';
    case 'sticker':
      return '🏷️ Sticker';
    case 'location':
      return '📍 Ubicación';
    case 'template':
      return '📋 Plantilla de WhatsApp';
    default:
      return txt || 'Sin mensajes';
  }
}

function StatusTicks({ status, errorMessage }) {
  const s = String(status || '').toUpperCase();
  if (s === 'FAILED') {
    return (
      <span
        className="crm-msg-ticks crm-msg-ticks-failed"
        title={errorMessage || 'No fue posible entregar el mensaje'}
      >
        <AlertCircle size={13} /> Error
      </span>
    );
  }
  if (s === 'READ') {
    return (
      <span className="crm-msg-ticks crm-msg-ticks-read" title="Leído">
        <CheckCheck size={14} />
      </span>
    );
  }
  if (s === 'DELIVERED') {
    return (
      <span className="crm-msg-ticks crm-msg-ticks-delivered" title="Entregado">
        <CheckCheck size={14} />
      </span>
    );
  }
  if (s === 'SENT') {
    return (
      <span className="crm-msg-ticks crm-msg-ticks-sent" title="Enviado">
        <Check size={14} />
      </span>
    );
  }
  return (
    <span className="crm-msg-ticks crm-msg-ticks-queued" title="Enviando…">
      <Clock3 size={12} />
    </span>
  );
}

function extractMediaInfo(message) {
  const content = message?.content || {};
  const type = String(message?.message_type || '').toLowerCase();
  const nested = content[type] || {};
  const link = content.link || nested.link || null;
  const caption =
    content.caption ||
    nested.caption ||
    (message.text_body &&
    !['[image]', '[audio]', '[video]', '[document]', '[sticker]', '[location]'].includes(
      String(message.text_body).trim().toLowerCase()
    )
      ? message.text_body
      : '');
  const filename = content.filename || nested.filename || 'Documento adjunto';
  const mimeType = content.mimeType || nested.mime_type || '';
  const isVoice = Boolean(content.voice ?? nested.voice);
  return { type, link, caption, filename, mimeType, isVoice, content };
}

function MessageBubble({ message, onOpenImage }) {
  const outbound = message.direction === 'OUTBOUND';
  const { type, link, caption, filename, mimeType, isVoice, content } =
    extractMediaInfo(message);

  const renderBody = () => {
    if (type === 'image' || type === 'sticker') {
      return (
        <div className="crm-media-block">
          {link ? (
            <button
              type="button"
              className={`crm-media-image-btn ${type === 'sticker' ? 'is-sticker' : ''}`}
              onClick={() => onOpenImage(link, caption || 'Imagen de WhatsApp')}
            >
              <img
                src={link}
                alt={caption || 'Imagen de WhatsApp'}
                loading="lazy"
              />
            </button>
          ) : (
            <div className="crm-media-placeholder">
              <ImageIcon size={18} />
              <span>{type === 'sticker' ? 'Sticker' : 'Imagen recibida'}</span>
            </div>
          )}
          {caption ? <p className="crm-media-caption">{caption}</p> : null}
        </div>
      );
    }

    if (type === 'audio') {
      return (
        <div className="crm-media-block crm-media-audio">
          <div className="crm-audio-header">
            {isVoice ? <Mic size={15} /> : <Headphones size={15} />}
            <span>{isVoice ? 'Nota de voz' : 'Audio de WhatsApp'}</span>
          </div>
          {link ? (
            <audio controls preload="metadata" src={link} className="crm-audio-player">
              Tu navegador no soporta reproducción de audio.
            </audio>
          ) : (
            <div className="crm-media-placeholder">
              <Mic size={16} />
              <span>Audio de WhatsApp</span>
            </div>
          )}
        </div>
      );
    }

    if (type === 'video') {
      return (
        <div className="crm-media-block">
          {link ? (
            <video
              controls
              preload="metadata"
              src={link}
              className="crm-video-player"
            />
          ) : (
            <div className="crm-media-placeholder">
              <Video size={18} />
              <span>Video de WhatsApp</span>
            </div>
          )}
          {caption ? <p className="crm-media-caption">{caption}</p> : null}
        </div>
      );
    }

    if (type === 'document') {
      return (
        <div className="crm-media-block">
          <a
            className="crm-document-card"
            href={link || '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!link) e.preventDefault();
            }}
          >
            <FileText size={22} />
            <div>
              <strong>{filename}</strong>
              <small>{mimeType || 'Documento'}</small>
            </div>
            {link && <ExternalLink size={15} />}
          </a>
          {caption ? <p className="crm-media-caption">{caption}</p> : null}
        </div>
      );
    }

    if (type === 'location') {
      const lat = content.latitude ?? content.location?.latitude;
      const lng = content.longitude ?? content.location?.longitude;
      const locName = content.name || content.location?.name || 'Ubicación compartida';
      const locAddress = content.address || content.location?.address || '';
      const mapsUrl =
        lat !== undefined && lng !== undefined
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : null;
      return (
        <div className="crm-media-block">
          <a
            className="crm-location-card"
            href={mapsUrl || '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!mapsUrl) e.preventDefault();
            }}
          >
            <MapPin size={20} />
            <div>
              <strong>{locName}</strong>
              {locAddress ? <small>{locAddress}</small> : null}
              {lat !== undefined && lng !== undefined ? (
                <small>
                  {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                </small>
              ) : null}
            </div>
            {mapsUrl && <ExternalLink size={14} />}
          </a>
        </div>
      );
    }

    if (type === 'template') {
      const tplName =
        content.templateName ||
        content.template?.name ||
        content.template ||
        'Plantilla oficial';
      const tplBody =
        content.bodyText ||
        message.text_body ||
        `Plantilla enviada: ${tplName}`;
      return (
        <div className="crm-template-bubble">
          <span className="crm-template-tag">
            <Sparkles size={12} /> Plantilla · {tplName}
          </span>
          <p>{tplBody}</p>
        </div>
      );
    }

    if (type === 'order') {
      const orderId = content.order_id || content.id;
      const orderTotal = content.total;
      const orderStatus = content.status || 'En preparación';
      const deliveryType = content.delivery_type || 'domicilio';
      const items = Array.isArray(content.items) ? content.items : [];
      return (
        <div className="crm-order-bubble-card">
          <div className="crm-order-bubble-header">
            <span className="crm-order-bubble-tag">
              <ShoppingBag size={14} /> Pedido #{orderId}
            </span>
            <span
              className={`ds-badge ds-badge-${
                ['Entregado', 'Completado'].includes(orderStatus)
                  ? 'success'
                  : orderStatus === 'Cancelado'
                  ? 'danger'
                  : 'warning'
              }`}
            >
              {orderStatus}
            </span>
          </div>
          <div className="crm-order-bubble-body">
            <div className="crm-order-bubble-summary">
              <span>{deliveryType.toLowerCase() === 'domicilio' ? '🛵 Domicilio' : '🏪 En local'}</span>
              <strong>{formatCurrency(orderTotal || 0)}</strong>
            </div>
            {items.length > 0 && (
              <ul className="crm-order-bubble-items">
                {items.slice(0, 3).map((it, idx) => (
                  <li key={idx}>
                    <span>{it.quantity}x {it.title}</span>
                  </li>
                ))}
                {items.length > 3 && <li className="crm-more-items">+{items.length - 3} más</li>}
              </ul>
            )}
            {message.text_body && !message.text_body.startsWith('Pedido #') && (
              <p className="crm-order-bubble-text">{message.text_body}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="crm-message-text">
        {message.text_body || `[${message.message_type || 'mensaje'}]`}
      </div>
    );
  };

  return (
    <article
      className={`crm-message ${outbound ? 'outbound' : 'inbound'} ${
        message.status === 'FAILED' ? 'is-failed' : ''
      }`}
    >
      <div className="crm-message-bubble">
        {renderBody()}
        <footer className="crm-message-meta">
          <time>{formatMessageTime(message.created_at || message.queued_at)}</time>
          {outbound && (
            <StatusTicks
              status={message.status}
              errorMessage={message.error_message}
            />
          )}
        </footer>
        {outbound && message.status === 'FAILED' && message.error_message && (
          <div className="crm-message-error-banner">
            <AlertCircle size={12} />
            <span>{message.error_message}</span>
          </div>
        )}
      </div>
    </article>
  );
}

export default function CrmInbox({ revision, lastRealtimeEvent = null, notify }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showOrderComposer, setShowOrderComposer] = useState(false);
  const [drawerTab, setDrawerTab] = useState('orders'); // 'orders' | 'profile' | 'notes'
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const messagesContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const lastConversationIdRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const selectedIdRef = useRef(null);
  const showScrollBottomRef = useRef(false);
  const listReqSeqRef = useRef(0);
  const detailReqSeqRef = useRef(0);

  useEffect(() => {
    selectedIdRef.current = selected;
  }, [selected]);

  const scrollToBottom = (behavior = 'smooth') => {
    setHasNewBelow(false);
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isScrolledUp = distanceFromBottom > 180;
    showScrollBottomRef.current = isScrolledUp;
    setShowScrollBottom(isScrolledUp);
    if (!isScrolledUp) {
      setHasNewBelow(false);
    }
  };

  const loadList = async (isBackground = false) => {
    const reqSeq = ++listReqSeqRef.current;
    try {
      const query = new URLSearchParams({ limit: 120, search, status });
      const data = await crmRequest(`/conversations?${query}`);
      if (reqSeq !== listReqSeqRef.current) return;
      const list = data.conversations || [];
      setConversations(list);
      if (!selectedIdRef.current && list.length > 0 && !searchParams.get('contactId')) {
        setSelected(list[0].id);
      }
    } catch (error) {
      if (!isBackground && reqSeq === listReqSeqRef.current) notify('error', error.message);
    }
  };

  const loadDetail = async (id = selected, isBackground = false) => {
    if (!id) return;
    const reqSeq = ++detailReqSeqRef.current;
    if (!isBackground) setLoadingDetail(true);

    const convFromList = conversations.find((c) => Number(c.id) === Number(id));
    if (
      !isBackground &&
      convFromList &&
      (!detail || Number(detail.conversation?.id) !== Number(id))
    ) {
      setDetail({
        conversation: {
          ...convFromList,
          contact_status: convFromList.contact_status || 'NUEVO_CONTACTO',
          status: convFromList.status || 'OPEN',
          orders_count: convFromList.orders_count || 0,
          total_spent: convFromList.total_spent || 0,
        },
        messages: [],
        orders: [],
        notes: [],
      });
    }

    try {
      const data = await crmRequest(`/conversations/${id}`);
      if (
        reqSeq !== detailReqSeqRef.current ||
        (selectedIdRef.current && Number(selectedIdRef.current) !== Number(id))
      ) {
        return;
      }

      const isSwitchedConversation =
        Number(lastConversationIdRef.current) !== Number(id);
      const serverMessages = data.messages || [];
      const latestMsg = serverMessages[serverMessages.length - 1];
      const hasNewMessage =
        latestMsg && Number(latestMsg.id) !== Number(lastMessageIdRef.current);

      // Conservar mensajes optimistas en vuelo (temp-...) que aún no estén confirmados en serverMessages
      setDetail((prev) => {
        const pendingOptimistic =
          prev && Number(prev.conversation?.id) === Number(id)
            ? (prev.messages || []).filter((m) => {
                if (!String(m.id).startsWith('temp-')) return false;
                if (m.status === 'FAILED') return true;
                return !serverMessages.some(
                  (srv) =>
                    srv.direction === 'OUTBOUND' &&
                    srv.text_body === m.text_body &&
                    Math.abs(
                      new Date(srv.created_at || srv.queued_at).getTime() -
                        new Date(m.created_at).getTime()
                    ) < 60_000
                );
              })
            : [];
        return {
          ...data,
          messages: [...serverMessages, ...pendingOptimistic],
        };
      });

      if (isSwitchedConversation && data.conversation) {
        setProfileForm({
          display_name: data.conversation.display_name || '',
          email: data.conversation.email || '',
          barrio: data.conversation.barrio || '',
          address: data.conversation.address || '',
          status: data.conversation.contact_status || 'PROSPECTO',
          source: data.conversation.contact_source || 'WHATSAPP',
        });
      }

      lastConversationIdRef.current = id;
      if (latestMsg) lastMessageIdRef.current = latestMsg.id;

      if (Number(data.conversation?.unread_count) > 0) {
        await crmRequest(`/conversations/${id}/read`, crmJson('POST', {}));
        setConversations((prev) =>
          prev.map((item) =>
            Number(item.id) === Number(id) ? { ...item, unread_count: 0 } : item
          )
        );
      }

      if (isSwitchedConversation) {
        setHasNewBelow(false);
        setTimeout(() => scrollToBottom('auto'), 35);
      } else if (hasNewMessage) {
        if (showScrollBottomRef.current) {
          setHasNewBelow(true);
        } else {
          setTimeout(() => scrollToBottom('smooth'), 35);
        }
      }
    } catch (error) {
      if (!isBackground && reqSeq === detailReqSeqRef.current) notify('error', error.message);
    } finally {
      if (!isBackground && reqSeq === detailReqSeqRef.current) setLoadingDetail(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!selected || !detail?.messages?.length || loadingOlder) return;
    const oldestId = detail.messages.find((m) => !String(m.id).startsWith('temp-'))?.id;
    if (!oldestId) return;
    setLoadingOlder(true);
    try {
      const data = await crmRequest(
        `/conversations/${selected}?before=${oldestId}`
      );
      if (data.messages?.length) {
        setDetail((prev) => {
          const existingIds = new Set((prev?.messages || []).map((m) => String(m.id)));
          const olderUnique = data.messages.filter((m) => !existingIds.has(String(m.id)));
          return {
            ...prev,
            messages: [...olderUnique, ...(prev?.messages || [])],
          };
        });
      } else {
        notify('success', 'Ya estás viendo el inicio de la conversación.');
      }
    } catch (error) {
      notify('error', error.message);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Soporte para abrir conversación directamente desde Contactos (?contactId=123)
  useEffect(() => {
    const contactIdParam = searchParams.get('contactId');
    if (!contactIdParam) return;
    crmRequest(
      '/conversations/open',
      crmJson('POST', { contact_id: Number(contactIdParam) })
    )
      .then((res) => {
        if (res.conversation?.id) {
          selectedIdRef.current = res.conversation.id;
          setSelected(res.conversation.id);
          searchParams.delete('contactId');
          setSearchParams(searchParams, { replace: true });
          loadList(true);
        }
      })
      .catch((err) => notify('error', err.message));
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => loadList(false), 180);
    return () => clearTimeout(timer);
  }, [search, status]);

  useEffect(() => {
    if (revision > 0) {
      loadList(true);
      const targetConvId = lastRealtimeEvent?.data?.conversationId;
      if (selected && (!targetConvId || Number(targetConvId) === Number(selected))) {
        loadDetail(selected, true);
      }
    }
  }, [revision]);

  useEffect(() => {
    crmRequest('/templates')
      .then((data) =>
        setTemplates(
          (data.templates || []).filter((item) => item.status === 'APPROVED')
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selected) loadDetail(selected, false);
    else setDetail(null);
  }, [selected]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadList(true);
      if (selected) loadDetail(selected, true);
    }, 3500);
    return () => clearInterval(interval);
  }, [selected, search, status]);

  const window24hInfo = useMemo(() => {
    const lastInbound = detail?.conversation?.last_inbound_at;
    if (!lastInbound) return { active: false, label: 'Sin mensaje entrante' };
    const elapsedMs = Date.now() - new Date(lastInbound).getTime();
    const remainingMs = 24 * 60 * 60 * 1000 - elapsedMs;
    if (remainingMs <= 0) {
      return {
        active: false,
        label: 'Ventana 24h cerrada · Usa plantilla',
      };
    }
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    return {
      active: true,
      label: `Ventana 24h activa (${hours}h ${mins}m)`,
    };
  }, [detail?.conversation?.last_inbound_at, revision]);

  const send = async () => {
    const cleanText = text.trim();
    if ((!cleanText && !templateId) || !selected || sending) return;
    const selectedTemplate = templates.find(
      (item) => String(item.id) === String(templateId)
    );

    // Optimistic UI: mostrar el mensaje inmediatamente en la conversación
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversation_id: selected,
      direction: 'OUTBOUND',
      message_type: selectedTemplate ? 'template' : 'text',
      text_body: selectedTemplate
        ? selectedTemplate.body_text || `[Plantilla: ${selectedTemplate.name}]`
        : cleanText,
      content: selectedTemplate
        ? {
            templateName: selectedTemplate.name,
            bodyText: selectedTemplate.body_text,
          }
        : { text: cleanText },
      status: 'QUEUED',
      created_at: new Date().toISOString(),
    };

    setDetail((prev) =>
      prev
        ? {
            ...prev,
            messages: [...(prev.messages || []), optimisticMsg],
          }
        : prev
    );
    setText('');
    setTemplateId('');
    setSending(true);
    setTimeout(() => scrollToBottom('smooth'), 20);

    try {
      const response = await crmRequest(
        `/conversations/${selected}/messages`,
        crmJson(
          'POST',
          selectedTemplate
            ? { template: { id: selectedTemplate.id, components: [] } }
            : { text: cleanText },
          { 'Idempotency-Key': crypto.randomUUID() }
        )
      );
      if (response.message) {
        lastMessageIdRef.current = response.message.id;
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                messages: (prev.messages || []).map((m) =>
                  m.id === tempId ? response.message : m
                ),
              }
            : prev
        );
      }
      setTimeout(() => {
        loadDetail(selected, true);
        loadList(true);
      }, 450);
    } catch (error) {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              messages: (prev.messages || []).map((m) =>
                m.id === tempId
                  ? { ...m, status: 'FAILED', error_message: error.message }
                  : m
              ),
            }
          : prev
      );
      notify('error', error.message);
    } finally {
      setSending(false);
    }
  };

  const updateConversation = async (
    nextStatus,
    assignedUserId = detail?.conversation?.assigned_user_id ?? null
  ) => {
    try {
      await crmRequest(
        `/conversations/${selected}`,
        crmJson('PUT', { status: nextStatus, assigned_user_id: assignedUserId })
      );
      await loadList(true);
      await loadDetail(selected, true);
    } catch (error) {
      notify('error', error.message);
    }
  };

  const saveContactProfile = async (e) => {
    e.preventDefault();
    const contactId = detail?.conversation?.contact_id;
    if (!contactId) return;
    setSavingProfile(true);
    try {
      await crmRequest(
        `/contacts/${contactId}`,
        crmJson('PUT', profileForm)
      );
      notify('success', 'Datos del cliente actualizados.');
      await loadDetail(selected, true);
      await loadList(true);
    } catch (error) {
      notify('error', error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const addQuickNote = async () => {
    const contactId = detail?.conversation?.contact_id;
    if (!contactId || !noteText.trim() || savingNote) return;
    setSavingNote(true);
    try {
      await crmRequest(
        `/contacts/${contactId}/notes`,
        crmJson('POST', { body: noteText.trim(), is_sensitive: false })
      );
      setNoteText('');
      notify('success', 'Nota guardada en el perfil del cliente.');
      await loadDetail(selected, true);
    } catch (error) {
      notify('error', error.message);
    } finally {
      setSavingNote(false);
    }
  };

  // Agrupar mensajes con separadores de fecha estilo WhatsApp
  const groupedMessages = useMemo(() => {
    const items = [];
    let lastDayKey = null;
    for (const msg of detail?.messages || []) {
      const ts = msg.created_at || msg.queued_at;
      const dayKey = getBogotaDayKey(ts);
      if (dayKey !== lastDayKey) {
        items.push({
          kind: 'divider',
          key: `div-${dayKey}-${msg.id}`,
          label: formatDateDivider(ts),
        });
        lastDayKey = dayKey;
      }
      items.push({ kind: 'message', key: msg.id, message: msg });
    }
    return items;
  }, [detail?.messages]);

  const conv = detail?.conversation;
  const orders = detail?.orders || [];
  const notes = detail?.notes || [];

  return (
    <section
      className={`crm-inbox ${selected ? 'show-detail' : ''} ${
        (showDrawer || showOrderComposer) && detail ? 'with-drawer' : ''
      }`}
    >
      {/* LISTA IZQUIERDA DE CHATS */}
      <aside className="crm-inbox-list ds-card">
        <header className="crm-inbox-list-header">
          <div>
            <span className="ds-page-kicker">WhatsApp Business</span>
            <h2>Conversaciones</h2>
          </div>
          <button
            className="ds-btn ds-btn-ghost ds-btn-sm"
            onClick={() => loadList(false)}
            title="Actualizar conversaciones"
          >
            <RefreshCw size={16} />
          </button>
        </header>

        <div className="crm-inbox-filters">
          <label className="ds-search">
            <span className="ds-search-icon">
              <Search size={16} />
            </span>
            <input
              className="ds-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nombre, teléfono o mensaje…"
            />
            {search && (
              <button
                type="button"
                className="crm-search-clear"
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="crm-filter-pills">
            {[
              { key: '', label: 'Todas' },
              { key: 'CHATS', label: 'Clientes' },
              { key: 'UNREAD', label: 'No leídas' },
              { key: 'OPEN', label: 'Abiertas' },
              { key: 'PENDING', label: 'Pendientes' },
              { key: 'CLOSED', label: 'Cerradas' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`crm-filter-pill ${status === tab.key ? 'active' : ''}`}
                onClick={() => setStatus(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="crm-conversation-list">
          {conversations.length ? (
            conversations.map((item) => {
              const isActive = Number(selected) === Number(item.id);
              const isOutboundLast = item.last_message_direction === 'OUTBOUND';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`crm-conv-item ${isActive ? 'active' : ''} ${
                    item.unread_count > 0 ? 'unread' : ''
                  }`}
                  onClick={() => setSelected(item.id)}
                >
                  <span className="crm-conversation-avatar">
                    {(
                      item.display_name ||
                      item.username ||
                      item.normalized_phone ||
                      '?'
                    )
                      .replace(/^[+@]/, '')[0]
                      ?.toUpperCase() || '?'}
                  </span>
                  <div className="crm-conv-item-body">
                    <div className="crm-conv-item-top">
                      <strong>
                        {item.display_name ||
                          item.normalized_phone ||
                          (item.username ? `@${item.username}` : 'Cliente WhatsApp')}
                      </strong>
                      <time>
                        {formatConversationDateShort(
                          item.last_message_created_at || item.last_message_at
                        )}
                      </time>
                    </div>
                    <p className="crm-conv-item-preview">
                      {isOutboundLast && (
                        <StatusTicks status={item.last_message_status} />
                      )}
                      <span>{getLastMessagePreview(item)}</span>
                    </p>
                    <div className="crm-conv-item-badges">
                      <small>{getContactSubtitle(item)}</small>
                      {Number(item.orders_count) > 0 && (
                        <span className="crm-conv-orders-pill">
                          <ShoppingBag size={10} /> {item.orders_count}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.unread_count > 0 && (
                    <b className="crm-unread-badge">{item.unread_count}</b>
                  )}
                </button>
              );
            })
          ) : (
            <div className="ds-empty-state">
              <MessageCircle />
              <h3>Sin conversaciones</h3>
              <p>Los mensajes entrantes y salientes aparecerán aquí en tiempo real.</p>
            </div>
          )}
        </div>
      </aside>

      {/* PANEL CENTRAL DE CHAT */}
      <main className="crm-chat ds-card">
        {conv ? (
          <>
            <header className="crm-chat-header">
              <button
                type="button"
                className="crm-chat-back"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
              <div className="crm-conversation-avatar">
                {(
                  conv.display_name ||
                  conv.username ||
                  conv.normalized_phone ||
                  '?'
                )
                  .replace(/^[+@]/, '')[0]
                  ?.toUpperCase() || '?'}
              </div>
              <div className="crm-chat-header-info">
                <div className="crm-chat-header-title">
                  <strong>
                    {conv.display_name ||
                      conv.normalized_phone ||
                      (conv.username ? `@${conv.username}` : 'Cliente WhatsApp')}
                  </strong>
                  <span
                    className={`ds-badge ds-badge-${crmStatusTone(
                      conv.contact_status
                    )}`}
                  >
                    {crmStatusLabel(conv.contact_status)}
                  </span>
                </div>
                <small>
                  {getContactSubtitle(conv)} ·{' '}
                  <span
                    className={`crm-window-indicator ${
                      window24hInfo.active ? 'is-open' : 'is-closed'
                    }`}
                  >
                    {window24hInfo.label}
                  </span>
                </small>
              </div>

              <div className="crm-chat-header-actions">
                {conv.normalized_phone && (
                  <a
                    className="ds-btn ds-btn-ghost ds-btn-sm"
                    href={`https://wa.me/${conv.normalized_phone.replace(/^\+/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir en WhatsApp externo"
                  >
                    <Phone size={15} />
                  </a>
                )}
                <select
                  className="ds-select crm-conversation-status"
                  value={conv.status}
                  onChange={(event) => updateConversation(event.target.value)}
                >
                  <option value="OPEN">Abierta</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="CLOSED">Cerrada</option>
                </select>
                <button
                  type="button"
                  className={`ds-btn ds-btn-sm ${
                    showOrderComposer ? 'ds-btn-primary' : 'ds-btn-secondary'
                  } crm-btn-create-order`}
                  onClick={() => {
                    setShowOrderComposer((v) => !v);
                    if (!showOrderComposer) setShowDrawer(false);
                  }}
                  title="Crear un pedido para este cliente directamente desde WhatsApp"
                >
                  <PlusCircle size={15} />
                  <span>+ CREAR PEDIDO</span>
                </button>
                <button
                  type="button"
                  className={`ds-btn ds-btn-sm ${
                    showDrawer && !showOrderComposer ? 'ds-btn-primary' : 'ds-btn-secondary'
                  }`}
                  onClick={() => {
                    setShowDrawer((v) => !v);
                    if (!showDrawer) setShowOrderComposer(false);
                  }}
                  title="Ver compras y ficha del cliente"
                >
                  <ShoppingBag size={15} />
                  <span>Compras ({conv.orders_count || orders.length || 0})</span>
                </button>
              </div>
            </header>

            <div className="crm-chat-context">
              <span>
                <ShoppingBag size={14} />
                <strong>{conv.orders_count || 0}</strong> pedidos completados
              </span>
              <span>
                <Package size={14} />
                <strong>{formatCurrency(conv.total_spent || 0)}</strong> acumulado
              </span>
              {conv.barrio && (
                <span>
                  <MapPin size={14} />
                  {conv.barrio}
                </span>
              )}
              {conv.last_purchase_at && (
                <span>
                  <Clock3 size={14} />
                  Última compra: {formatDateTime(conv.last_purchase_at)}
                </span>
              )}
            </div>

            <div
              className="crm-messages"
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
            >
              {detail.messages?.length >= 100 && (
                <div className="crm-load-older-wrap">
                  <button
                    type="button"
                    className="ds-btn ds-btn-secondary ds-btn-sm"
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                  >
                    {loadingOlder
                      ? 'Cargando mensajes…'
                      : 'Cargar mensajes anteriores'}
                  </button>
                </div>
              )}

              {loadingDetail && detail.messages.length === 0 ? (
                <div className="crm-chat-loading">
                  <RefreshCw className="spin" size={22} />
                  <span>Cargando conversación…</span>
                </div>
              ) : groupedMessages.length ? (
                groupedMessages.map((item) =>
                  item.kind === 'divider' ? (
                    <div key={item.key} className="crm-date-divider">
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    <MessageBubble
                      key={item.key}
                      message={item.message}
                      onOpenImage={(url, caption) =>
                        setLightboxImage({ url, caption })
                      }
                    />
                  )
                )
              ) : (
                <div className="ds-empty-state">
                  <MessageCircle />
                  <h3>Sin mensajes aún</h3>
                  <p>Envía una plantilla o mensaje para iniciar la conversación.</p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {showScrollBottom && (
              <button
                type="button"
                className="crm-scroll-bottom-btn"
                onClick={() => scrollToBottom('smooth')}
                title="Ir al último mensaje"
              >
                <ArrowDown size={16} />
                {hasNewBelow && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0 4px' }}>Nuevos</span>}
              </button>
            )}

            <footer className="crm-composer">
              <div className="crm-template-row">
                <select
                  className="ds-select"
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  <option value="">
                    💬 Mensaje directo (Enter para enviar · Shift+Enter nueva línea)
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      📋 Plantilla: {template.name} · {template.language}
                    </option>
                  ))}
                </select>
                {!window24hInfo.active && !templateId && templates.length > 0 && (
                  <small className="crm-window-warning">
                    Han pasado más de 24h desde el último mensaje del cliente. Si Meta rechaza el texto libre, selecciona una plantilla aprobada.
                  </small>
                )}
              </div>

              {!templateId ? (
                <textarea
                  className="ds-textarea"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Escribe un mensaje como en WhatsApp…"
                />
              ) : (
                <div className="crm-template-preview-box">
                  <Sparkles size={16} />
                  <span>
                    Se enviará la plantilla oficial{' '}
                    <strong>
                      {
                        templates.find((t) => String(t.id) === String(templateId))
                          ?.name
                      }
                    </strong>{' '}
                    a {conv.display_name || conv.normalized_phone}.
                  </span>
                </div>
              )}

              <button
                type="button"
                className="ds-btn ds-btn-primary crm-send-btn"
                onClick={send}
                disabled={sending || (!text.trim() && !templateId)}
              >
                <Send size={17} />
                <span>{sending ? 'Enviando…' : 'Enviar'}</span>
              </button>
            </footer>
          </>
        ) : (
          <div className="ds-empty-state">
            <MessageCircle />
            <h3>Selecciona una conversación</h3>
            <p>
              Responde mensajes de WhatsApp en tiempo real y consulta todas las
              compras del cliente sin salir de la pantalla.
            </p>
          </div>
        )}
      </main>

      {/* PANEL LATERAL DERECHO: COMPOSITOR DE PEDIDOS (Lazy loaded) */}
      {conv && showOrderComposer && (
        <React.Suspense
          fallback={
            <aside className="crm-chat-drawer ds-card">
              <div className="crm-composer-loading">
                <RefreshCw className="spin" size={24} />
                <p>Cargando panel de pedidos…</p>
              </div>
            </aside>
          }
        >
          <CrmOrderComposer
            conversation={conv}
            contact={conv}
            window24hActive={window24hInfo.active}
            onClose={() => setShowOrderComposer(false)}
            onOrderCreated={(createdResult) => {
              notify('success', `Pedido #${createdResult.order.id} creado con éxito (${createdResult.order.status}).`);
              setDetail((prev) => {
                if (!prev) return prev;
                const existingOrders = prev.orders || [];
                return {
                  ...prev,
                  orders: [createdResult.order, ...existingOrders.filter((o) => o.id !== createdResult.order.id)],
                  conversation: {
                    ...prev.conversation,
                    orders_count: (Number(prev.conversation?.orders_count) || 0) + 1,
                    total_spent: (Number(prev.conversation?.total_spent) || 0) + Number(createdResult.order.total || 0),
                  },
                };
              });
              loadDetail(selected, true);
            }}
          />
        </React.Suspense>
      )}

      {/* PANEL LATERAL DERECHO: COMPRAS Y PERFIL DEL CLIENTE */}
      {conv && showDrawer && !showOrderComposer && (
        <aside className="crm-chat-drawer ds-card">
          <header className="crm-drawer-header">
            <div className="crm-drawer-tabs">
              <button
                type="button"
                className={drawerTab === 'orders' ? 'active' : ''}
                onClick={() => setDrawerTab('orders')}
              >
                <ShoppingBag size={14} /> Compras ({orders.length})
              </button>
              <button
                type="button"
                className={drawerTab === 'profile' ? 'active' : ''}
                onClick={() => setDrawerTab('profile')}
              >
                <UserRound size={14} /> Cliente
              </button>
              <button
                type="button"
                className={drawerTab === 'notes' ? 'active' : ''}
                onClick={() => setDrawerTab('notes')}
              >
                <StickyNote size={14} /> Notas ({notes.length})
              </button>
            </div>
            <button
              type="button"
              className="ds-btn ds-btn-ghost ds-btn-sm"
              onClick={() => setShowDrawer(false)}
              title="Cerrar panel"
            >
              <X size={15} />
            </button>
          </header>

          <div className="crm-drawer-body">
            {drawerTab === 'orders' && (
              <div className="crm-drawer-orders">
                <div className="crm-drawer-kpis">
                  <div>
                    <span>Pedidos</span>
                    <strong>{conv.orders_count || 0}</strong>
                  </div>
                  <div>
                    <span>Total comprado</span>
                    <strong>{formatCurrency(conv.total_spent || 0)}</strong>
                  </div>
                  <div>
                    <span>Ticket prom.</span>
                    <strong>{formatCurrency(conv.average_ticket || 0)}</strong>
                  </div>
                </div>

                {orders.length ? (
                  <div className="crm-drawer-order-list">
                    {orders.map((order) => {
                      const items = Array.isArray(order.cart_json)
                        ? order.cart_json
                        : [];
                      return (
                        <article key={order.id} className="crm-drawer-order-card">
                          <div className="crm-drawer-order-top">
                            <strong>Pedido #{order.id}</strong>
                            <span
                              className={`ds-badge ds-badge-${
                                ['Entregado', 'Completado'].includes(order.status)
                                  ? 'success'
                                  : order.status === 'Cancelado'
                                  ? 'danger'
                                  : 'warning'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <small className="crm-drawer-order-meta">
                            {formatDateTime(order.created_at)} ·{' '}
                            {order.delivery_type || 'Domicilio'} ·{' '}
                            {order.payment_method || 'Efectivo'}
                          </small>
                          {items.length > 0 && (
                            <ul className="crm-drawer-order-items">
                              {items.map((item, idx) => (
                                <li key={idx}>
                                  <span>
                                    {item.quantity || 1}x {item.title || item.name}
                                  </span>
                                  {item.price ? (
                                    <small>
                                      {formatCurrency(
                                        (Number(item.quantity) || 1) *
                                          Number(item.price)
                                      )}
                                    </small>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                          {order.address && (
                            <small className="crm-drawer-order-address">
                              📍 {order.address}
                              {order.barrio ? ` (${order.barrio})` : ''}
                            </small>
                          )}
                          <div className="crm-drawer-order-total">
                            <span>Total</span>
                            <strong>{formatCurrency(order.total)}</strong>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ds-empty-state">
                    <ShoppingBag />
                    <h3>Sin compras registradas</h3>
                    <p>Este contacto aún no tiene pedidos vinculados.</p>
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'profile' && (
              <form className="ds-form crm-drawer-form" onSubmit={saveContactProfile}>
                <label className="ds-form-group">
                  <span className="ds-form-label">Nombre del cliente</span>
                  <input
                    className="ds-input"
                    value={profileForm.display_name || ''}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        display_name: e.target.value,
                      })
                    }
                    placeholder="Nombre completo"
                  />
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Teléfono / WhatsApp</span>
                  <input
                    className="ds-input"
                    value={getContactSubtitle(conv)}
                    disabled
                  />
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Estado CRM</span>
                  <select
                    className="ds-select"
                    value={profileForm.status || 'PROSPECTO'}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, status: e.target.value })
                    }
                  >
                    {CRM_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {crmStatusLabel(st)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Barrio</span>
                  <input
                    className="ds-input"
                    value={profileForm.barrio || ''}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, barrio: e.target.value })
                    }
                    placeholder="Barrio frecuente"
                  />
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Dirección de entrega</span>
                  <input
                    className="ds-input"
                    value={profileForm.address || ''}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, address: e.target.value })
                    }
                    placeholder="Dirección principal"
                  />
                </label>
                <label className="ds-form-group">
                  <span className="ds-form-label">Correo electrónico</span>
                  <input
                    className="ds-input"
                    type="email"
                    value={profileForm.email || ''}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    placeholder="cliente@correo.com"
                  />
                </label>
                <button
                  type="submit"
                  className="ds-btn ds-btn-primary"
                  disabled={savingProfile}
                >
                  <Save size={15} />
                  {savingProfile ? 'Guardando…' : 'Guardar cliente'}
                </button>
              </form>
            )}

            {drawerTab === 'notes' && (
              <div className="crm-drawer-notes">
                <div className="crm-drawer-note-box">
                  <textarea
                    className="ds-textarea"
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Agregar nota sobre gustos, observaciones o acuerdos…"
                  />
                  <button
                    type="button"
                    className="ds-btn ds-btn-secondary ds-btn-sm"
                    onClick={addQuickNote}
                    disabled={savingNote || !noteText.trim()}
                  >
                    <StickyNote size={14} />{' '}
                    {savingNote ? 'Guardando…' : 'Guardar nota'}
                  </button>
                </div>
                <div className="crm-drawer-note-list">
                  {notes.length ? (
                    notes.map((n) => (
                      <article key={n.id} className="crm-drawer-note-item">
                        <p>{n.body}</p>
                        <small>
                          {n.creator_name || 'Admin'} ·{' '}
                          {formatDateTime(n.created_at)}
                        </small>
                      </article>
                    ))
                  ) : (
                    <p className="ds-text-muted">Sin notas registradas.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* MODAL DE VISTA PREVIA DE IMAGEN */}
      {lightboxImage && (
        <div
          className="ds-modal-overlay"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="crm-image-lightbox"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <span>{lightboxImage.caption || 'Imagen de WhatsApp'}</span>
              <div>
                <a
                  href={lightboxImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ds-btn ds-btn-secondary ds-btn-sm"
                >
                  <ExternalLink size={14} /> Abrir original
                </a>
                <button
                  type="button"
                  className="ds-modal-close"
                  onClick={() => setLightboxImage(null)}
                >
                  <X />
                </button>
              </div>
            </header>
            <img src={lightboxImage.url} alt={lightboxImage.caption} />
          </div>
        </div>
      )}
    </section>
  );
}
