import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, Minus, Send, RotateCcw, 
  Copy, Check, AlertCircle, ExternalLink,
  MessageSquare, History, Plus, Trash2, Clock, CheckCircle2,
  AlertTriangle, Flag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import bonyAvatarImg from '../assets/bony-pinscher.jpg';

// Función para normalizar Markdown y corregir tablas con barras escapadas (\| -> |)
function prepareMarkdownContent(content) {
  if (!content || typeof content !== 'string') return '';
  let text = content;
  // Reemplazar barras escapadas que bloquean la detección de tablas en GFM
  text = text.replace(/\\\|/g, '|');
  // Asegurar salto de línea antes de tablas si vienen pegadas al texto
  text = text.replace(/([^\n])\n(\|[^\n]+\|\n\|[-:\s|]+\|)/g, '$1\n\n$2');
  return text;
}

export default function BonyFloatingWidget({ defaultOpen = false }) {
  const token = sessionStorage.getItem('distrito_admin_token');

  // Estado del widget flotante
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'history'
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Conversación activa y mensajes
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('bony_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [conversationId, setConversationId] = useState(() => {
    return sessionStorage.getItem('bony_conversation_id') || null;
  });
  const [activeConvTitle, setActiveConvTitle] = useState(() => {
    return sessionStorage.getItem('bony_conversation_title') || '';
  });
  const [conversationStatus, setConversationStatus] = useState(() => {
    return sessionStorage.getItem('bony_conversation_status') || 'ACTIVE';
  });

  // Modal de confirmación para finalizar conversación
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Historial de conversaciones
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const widgetContainerRef = useRef(null);

  // Persistir estado de chat activo en sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('bony_chat_messages', JSON.stringify(messages));
      if (conversationId) {
        sessionStorage.setItem('bony_conversation_id', conversationId);
      } else {
        sessionStorage.removeItem('bony_conversation_id');
      }
      if (activeConvTitle) {
        sessionStorage.setItem('bony_conversation_title', activeConvTitle);
      } else {
        sessionStorage.removeItem('bony_conversation_title');
      }
      sessionStorage.setItem('bony_conversation_status', conversationStatus);
    } catch (e) {
      console.warn('No se pudo guardar la conversación en sessionStorage:', e);
    }
  }, [messages, conversationId, activeConvTitle, conversationStatus]);

  // Cargar lista de conversaciones desde el backend
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    setLoadingConversations(true);
    try {
      const res = await fetch(`${API_URL}/admin/ai/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.warn('Error cargando historial de conversaciones:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [token]);

  // Cargar conversaciones al abrir el widget o cambiar a la pestaña de historial
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  // Auto-scroll al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, loading, isOpen, isMinimized, activeTab]);

  // Manejador tecla ESC para cerrar modal o cerrar widget
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showCompleteModal) {
          setShowCompleteModal(false);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showCompleteModal]);

  // Auto-ajustar altura del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Copiar al portapapeles
  const handleCopy = (text, index) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Iniciar nueva conversación directamente
  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setActiveConvTitle('');
    setConversationStatus('ACTIVE');
    setError(null);
    setInputValue('');
    setActiveTab('chat');
    sessionStorage.removeItem('bony_chat_messages');
    sessionStorage.removeItem('bony_conversation_id');
    sessionStorage.removeItem('bony_conversation_title');
    sessionStorage.setItem('bony_conversation_status', 'ACTIVE');
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Cargar una conversación previa seleccionada del historial
  const handleSelectConversation = async (conv) => {
    setLoadingChat(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/ai/conversations/${conv.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('No fue posible cargar la conversación');
      const data = await res.json();
      const parsedMessages = (data.messages || []).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolCalls: m.tool_calls ? (typeof m.tool_calls === 'string' ? JSON.parse(m.tool_calls) : m.tool_calls) : [],
        createdAt: m.created_at
      }));
      setConversationId(conv.id);
      setActiveConvTitle(conv.title || 'Conversación guardada');
      setConversationStatus(conv.status || data.conversation?.status || 'ACTIVE');
      setMessages(parsedMessages);
      setActiveTab('chat');
    } catch (err) {
      setError(err.message || 'Error al recuperar mensajes del historial');
    } finally {
      setLoadingChat(false);
    }
  };

  // Confirmar y procesar la finalización de la conversación
  const handleConfirmCompleteConversation = async () => {
    if (loading) {
      setError('Por favor espera a que Bony termine de responder antes de finalizar la conversación.');
      setShowCompleteModal(false);
      return;
    }

    setIsCompleting(true);
    setError(null);

    try {
      if (conversationId) {
        const res = await fetch(`${API_URL}/admin/ai/conversations/${conversationId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'No fue posible finalizar la conversación en el servidor.');
        }
      }

      // Cerrar modal
      setShowCompleteModal(false);

      // Actualizar listado de historial para que aparezca como completada
      await fetchConversations();

      // Abrir automáticamente una nueva conversación vacía y activa
      handleNewConversation();
    } catch (err) {
      console.error('Error finalizando conversación:', err);
      setError(err.message || 'Error al finalizar la conversación');
      setShowCompleteModal(false);
    } finally {
      setIsCompleting(false);
    }
  };

  // Eliminar conversación del historial
  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/admin/ai/conversations/${convId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (conversationId === convId) {
        handleNewConversation();
      }
    } catch (err) {
      console.warn('Error eliminando conversación:', err);
    }
  };

  // Enviar mensaje a Bony
  const handleSendMessage = async (customText = null) => {
    if (conversationStatus === 'COMPLETED') {
      setError('Esta conversación está finalizada. Por favor inicia una nueva conversación para continuar chateando.');
      return;
    }

    const textToSend = customText || inputValue.trim();
    if (!textToSend || loading) return;

    setError(null);
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

    try {
      const historyPayload = newMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${API_URL}/admin/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend,
          conversationId,
          history: historyPayload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al consultar a Bony');
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        setActiveConvTitle(textToSend.substring(0, 40));
        setConversationStatus('ACTIVE');
        fetchConversations();
      }

      const replyContent = data.response || data.reply || '';
      const bonyReply = {
        id: Date.now() + 1,
        role: 'assistant',
        content: replyContent,
        toolCalls: data.executedActions || data.toolCalls || [],
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, bonyReply]);
    } catch (err) {
      console.error('Error enviando mensaje a Bony:', err);
      setError(err.message || 'No fue posible conectar con Bony en este momento');
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (textareaRef.current && conversationStatus !== 'COMPLETED') {
          textareaRef.current.focus();
        }
      }, 50);
    }
  };

  const handleKeyDownInput = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Formato relativo amigable para fechas
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} d`;
      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Preguntas sugeridas
  const suggestedPrompts = [
    '📊 Analiza las ventas y gastos del 22 al 25 de octubre',
    '📦 ¿Qué insumos están en nivel crítico de inventario?',
    '🍔 ¿Cuánto cuesta la receta del Combo Distric Burger 2?',
    '🛵 ¿Cuántos fletes se han cobrado y qué valor tienen?'
  ];

  return (
    <>
      {/* BOTÓN FLOTANTE FIJO (Esquina inferior derecha) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="bony-floating-toggle-btn"
          aria-label="Abrir asistente inteligente Bony de Distric House"
          title="Abrir a Bony — Asistente Inteligente de Distric House"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 140,
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--ds-bg-surface, #1E293B)',
            border: '2px solid var(--ds-primary, #EF4444)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(239, 68, 68, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(239, 68, 68, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(239, 68, 68, 0.3)';
          }}
        >
          {/* Avatar del Pinscher negro */}
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <img 
              src={bonyAvatarImg} 
              alt="Bony Pinscher Negro" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Badge o punto indicador en línea */}
          <span 
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 4px rgba(16, 185, 129, 0.8)'
            }}
            title="Bony en línea"
          />
        </button>
      )}

      {/* VENTANA FLOTANTE DE BONY */}
      {isOpen && (
        <div
          ref={widgetContainerRef}
          role="dialog"
          aria-labelledby="bony-widget-title"
          aria-modal="false"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 150,
            width: 'min(450px, calc(100vw - 32px))',
            height: isMinimized ? '58px' : 'min(640px, calc(100vh - 80px))',
            maxHeight: 'calc(100vh - 48px)',
            background: 'var(--ds-bg-surface, #FFFFFF)',
            color: 'var(--ds-text-primary, #0F172A)',
            borderRadius: '16px',
            border: '1px solid var(--ds-border, #E2E8F0)',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'height 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
            fontFamily: 'inherit',
            position: 'fixed'
          }}
        >
          {/* MODAL DIALOG: CONFIRMAR FINALIZAR CONVERSACIÓN */}
          {showCompleteModal && (
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(3px)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                animation: 'fadeIn 0.15s ease'
              }}
              onClick={() => {
                if (!isCompleting) setShowCompleteModal(false);
              }}
            >
              <div 
                style={{
                  background: 'var(--ds-bg-surface, #FFFFFF)',
                  borderRadius: '14px',
                  border: '1px solid var(--ds-border, #E2E8F0)',
                  boxShadow: '0 20px 30px rgba(0,0,0,0.25)',
                  width: '100%',
                  maxWidth: '340px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--ds-text-primary, #0F172A)' }}>
                      ¿Finalizar conversación?
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--ds-text-muted, #94A3B8)' }}>
                      Asistente Bony
                    </span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--ds-text-secondary, #475569)', lineHeight: '1.5' }}>
                  Esta conversación se guardará en tu historial y podrás consultarla después. Se abrirá una conversación nueva para que puedas seguir trabajando con Bony.
                </p>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={() => setShowCompleteModal(false)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--ds-border, #CBD5E1)',
                      background: 'var(--ds-bg-elevated, #F1F5F9)',
                      color: 'var(--ds-text-primary, #0F172A)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: isCompleting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={handleConfirmCompleteConversation}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--ds-primary, #EF4444)',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: isCompleting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    {isCompleting ? (
                      <span>Finalizando...</span>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Finalizar y nueva conversación</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CABECERA DE LA VENTANA */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              userSelect: 'none',
              cursor: isMinimized ? 'pointer' : 'default',
              flexShrink: 0
            }}
            onClick={isMinimized ? () => setIsMinimized(false) : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Avatar circular */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(239, 68, 68, 0.8)',
                flexShrink: 0,
                position: 'relative'
              }}>
                <img 
                  src={bonyAvatarImg} 
                  alt="Bony Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span id="bony-widget-title" style={{ fontWeight: '700', fontSize: '14.5px', letterSpacing: '-0.2px' }}>
                    Bony
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    background: conversationStatus === 'COMPLETED' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: conversationStatus === 'COMPLETED' ? '#CBD5E1' : '#F87171',
                    border: conversationStatus === 'COMPLETED' ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '1px 6px',
                    borderRadius: '999px'
                  }}>
                    {conversationStatus === 'COMPLETED' ? 'Solo Lectura' : 'IA Oficial'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: conversationStatus === 'COMPLETED' ? '#94A3B8' : '#10B981', 
                    display: 'inline-block' 
                  }} />
                  <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeConvTitle ? activeConvTitle : 'En línea · Gemini 3.5'}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones de cabecera */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Pestaña Chat / Historial */}
              {!isMinimized && (
                <div style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '2px',
                  marginRight: '2px'
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    style={{
                      background: activeTab === 'chat' ? 'var(--ds-primary, #EF4444)' : 'transparent',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '4px 7px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Ver Chat Actual"
                  >
                    <MessageSquare size={13} />
                    <span>Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('history');
                      fetchConversations();
                    }}
                    style={{
                      background: activeTab === 'history' ? 'var(--ds-primary, #EF4444)' : 'transparent',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '4px 7px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Historial de Conversaciones"
                  >
                    <History size={13} />
                    <span>Historial</span>
                  </button>
                </div>
              )}

              {/* Botón Finalizar Conversación (Visible si hay mensajes y está activa) */}
              {!isMinimized && activeTab === 'chat' && messages.length > 0 && conversationStatus === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#FCA5A5',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}
                  title="Finalizar y archivar conversación"
                  aria-label="Finalizar conversación"
                >
                  <Flag size={12} />
                  <span>Finalizar</span>
                </button>
              )}

              {/* Botón nueva conversación rápida */}
              {!isMinimized && (
                <button
                  type="button"
                  onClick={handleNewConversation}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Nueva conversación vacía"
                  aria-label="Nueva conversación"
                >
                  <Plus size={16} />
                </button>
              )}

              {/* Botón ver pantalla completa */}
              <Link
                to="/admin/bony"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none'
                }}
                title="Abrir en pantalla completa"
                aria-label="Abrir en pantalla completa"
              >
                <ExternalLink size={15} />
              </Link>

              {/* Botón minimizar */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={isMinimized ? 'Maximizar' : 'Minimizar'}
                aria-label={isMinimized ? 'Maximizar asistente' : 'Minimizar asistente'}
              >
                <Minus size={15} />
              </button>

              {/* Botón cerrar */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Cerrar asistente"
                aria-label="Cerrar asistente"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* CONTENIDO DEL WIDGET (Oculto cuando está minimizado) */}
          {!isMinimized && (
            <>
              {/* PESTAÑA 1: HISTORIAL DE CONVERSACIONES */}
              {activeTab === 'history' && (
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'var(--ds-bg-base, #F8FAFC)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ds-text-primary, #0F172A)' }}>
                      Tus Conversaciones Guardadas
                    </span>
                    <button
                      type="button"
                      onClick={handleNewConversation}
                      style={{
                        background: 'var(--ds-primary, #EF4444)',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={13} />
                      <span>Nuevo Chat</span>
                    </button>
                  </div>

                  {loadingConversations ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--ds-text-muted, #94A3B8)', fontSize: '12px' }}>
                      Cargando historial de Bony...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '30px 15px',
                      background: 'var(--ds-bg-surface, #FFFFFF)',
                      border: '1px solid var(--ds-border, #E2E8F0)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <History size={28} color="var(--ds-text-muted, #94A3B8)" />
                      <strong style={{ fontSize: '13px', color: 'var(--ds-text-primary, #0F172A)' }}>
                        Sin conversaciones anteriores
                      </strong>
                      <p style={{ fontSize: '12px', color: 'var(--ds-text-secondary, #64748B)', margin: 0 }}>
                        Inicia una nueva charla con Bony para consultar ventas, recetas o inventario.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {conversations.map(conv => {
                        const isActive = conv.id === conversationId;
                        const isCompleted = conv.status === 'COMPLETED';

                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            style={{
                              background: isActive ? 'var(--ds-bg-elevated, #F1F5F9)' : 'var(--ds-bg-surface, #FFFFFF)',
                              border: isActive ? '1.5px solid var(--ds-primary, #EF4444)' : '1px solid var(--ds-border, #E2E8F0)',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.borderColor = 'var(--ds-primary, #EF4444)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.borderColor = 'var(--ds-border, #E2E8F0)';
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MessageSquare size={13} color={isActive ? '#EF4444' : '#64748B'} style={{ flexShrink: 0 }} />
                                <strong style={{
                                  fontSize: '12.5px',
                                  color: 'var(--ds-text-primary, #0F172A)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {conv.title || 'Conversación sin título'}
                                </strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ds-text-muted, #94A3B8)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={11} />
                                  {formatRelativeTime(conv.updated_at || conv.created_at)}
                                </span>
                                
                                {isCompleted ? (
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    color: '#64748B',
                                    background: '#F1F5F9',
                                    border: '1px solid #E2E8F0',
                                    padding: '1px 5px',
                                    borderRadius: '4px'
                                  }}>
                                    Finalizada
                                  </span>
                                ) : (
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    color: '#059669',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    padding: '1px 5px',
                                    borderRadius: '4px'
                                  }}>
                                    Activa
                                  </span>
                                )}

                                {isActive && (
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#EF4444',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    padding: '1px 5px',
                                    borderRadius: '4px'
                                  }}>
                                    En pantalla
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--ds-text-muted, #94A3B8)',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Eliminar conversación"
                              aria-label="Eliminar conversación"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 2: CHAT CON BONY */}
              {activeTab === 'chat' && (
                <>
                  <div 
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: 'var(--ds-bg-base, #F8FAFC)'
                    }}
                  >
                    {loadingChat && (
                      <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'var(--ds-text-muted, #94A3B8)' }}>
                        Cargando conversación...
                      </div>
                    )}

                    {/* Banner si la conversación está finalizada (Modo solo lectura) */}
                    {conversationStatus === 'COMPLETED' && (
                      <div style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--ds-text-secondary, #475569)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={16} color="#059669" />
                          <span><strong>Conversación Finalizada:</strong> Modo de consulta y lectura activa.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleNewConversation}
                          style={{
                            background: 'var(--ds-primary, #EF4444)',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Plus size={12} />
                          <span>Nuevo Chat</span>
                        </button>
                      </div>
                    )}

                    {/* Bienvenida y sugerencias cuando no hay mensajes */}
                    {messages.length === 0 && !loadingChat && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 8px' }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          marginBottom: '10px',
                          border: '2px solid var(--ds-border, #E2E8F0)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}>
                          <img src={bonyAvatarImg} alt="Bony Pinscher" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--ds-text-primary, #0F172A)' }}>
                          ¡Hola! Soy Bony
                        </h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--ds-text-secondary, #64748B)', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                          Tu copiloto operativo y financiero en Distric House. Pregúntame sobre ventas, rentabilidad, inventario o recetas.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ds-text-muted, #94A3B8)', textAlign: 'left', paddingLeft: '4px' }}>
                            PREGUNTAS SUGERIDAS:
                          </span>
                          {suggestedPrompts.map((prompt, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSendMessage(prompt)}
                              style={{
                                background: 'var(--ds-bg-surface, #FFFFFF)',
                                border: '1px solid var(--ds-border, #E2E8F0)',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                color: 'var(--ds-text-primary, #0F172A)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--ds-primary, #EF4444)';
                                e.currentTarget.style.background = 'var(--ds-bg-elevated, #F1F5F9)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--ds-border, #E2E8F0)';
                                e.currentTarget.style.background = 'var(--ds-bg-surface, #FFFFFF)';
                              }}
                            >
                              <span style={{ flex: 1 }}>{prompt}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lista de mensajes */}
                    {messages.map((msg, index) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '100%'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            maxWidth: isUser ? '85%' : '96%',
                            flexDirection: isUser ? 'row-reverse' : 'row'
                          }}>
                            {/* Mini avatar */}
                            {!isUser && (
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                flexShrink: 0,
                                marginTop: '2px',
                                border: '1px solid var(--ds-border, #CBD5E1)'
                              }}>
                                <img src={bonyAvatarImg} alt="Bony" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            )}

                            <div 
                              className={isUser ? 'bony-user-msg' : 'bony-assistant-msg'}
                              style={{
                                background: isUser 
                                  ? 'var(--ds-primary, #EF4444)' 
                                  : 'var(--ds-bg-surface, #FFFFFF)',
                                color: isUser 
                                  ? '#FFFFFF' 
                                  : 'var(--ds-text-primary, #0F172A)',
                                padding: '10px 14px',
                                borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                wordBreak: 'break-word',
                                border: isUser ? 'none' : '1px solid var(--ds-border, #E2E8F0)',
                                boxShadow: isUser ? '0 2px 6px rgba(239, 68, 68, 0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                                position: 'relative'
                              }}
                            >
                              {isUser ? (
                                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                              ) : (
                                <div className="bony-markdown-container">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      table: ({ node, ...props }) => (
                                        <div style={{ 
                                          overflowX: 'auto', 
                                          margin: '10px 0', 
                                          borderRadius: '8px', 
                                          border: '1px solid var(--ds-border, #CBD5E1)',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                        }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left', minWidth: '300px' }} {...props} />
                                        </div>
                                      ),
                                      thead: ({ node, ...props }) => (
                                        <thead style={{ background: 'var(--ds-bg-elevated, #F1F5F9)', borderBottom: '2px solid var(--ds-border, #CBD5E1)' }} {...props} />
                                      ),
                                      th: ({ node, ...props }) => (
                                        <th style={{ padding: '7px 9px', fontWeight: '700', color: 'var(--ds-text-primary, #0F172A)', borderRight: '1px solid var(--ds-border, #E2E8F0)', whiteSpace: 'nowrap' }} {...props} />
                                      ),
                                      td: ({ node, ...props }) => (
                                        <td style={{ padding: '6px 9px', borderBottom: '1px solid var(--ds-border, #E2E8F0)', borderRight: '1px solid var(--ds-border, #F1F5F9)' }} {...props} />
                                      ),
                                      p: ({ node, ...props }) => <p style={{ margin: '0 0 8px 0', lineHeight: '1.5' }} {...props} />,
                                      strong: ({ node, ...props }) => <strong style={{ fontWeight: '700', color: 'var(--ds-text-primary, #0F172A)' }} {...props} />,
                                      ul: ({ node, ...props }) => <ul style={{ margin: '4px 0 8px 0', paddingLeft: '18px' }} {...props} />,
                                      ol: ({ node, ...props }) => <ol style={{ margin: '4px 0 8px 0', paddingLeft: '18px' }} {...props} />,
                                      li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                                      code: ({ node, inline, ...props }) => (
                                        <code style={{ background: 'var(--ds-bg-elevated, #F1F5F9)', padding: '2px 5px', borderRadius: '4px', fontSize: '11.5px', fontFamily: 'monospace' }} {...props} />
                                      ),
                                      blockquote: ({ node, ...props }) => (
                                        <blockquote style={{ borderLeft: '3px solid var(--ds-primary, #EF4444)', margin: '6px 0', paddingLeft: '10px', color: 'var(--ds-text-secondary, #64748B)' }} {...props} />
                                      )
                                    }}
                                  >
                                    {prepareMarkdownContent(msg.content)}
                                  </ReactMarkdown>
                                </div>
                              )}

                              {/* Botón copiar en mensajes de Bony */}
                              {!isUser && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(msg.content, index)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--ds-text-muted, #94A3B8)',
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '10.5px'
                                    }}
                                    title="Copiar respuesta"
                                  >
                                    {copiedIndex === index ? (
                                      <>
                                        <Check size={12} color="#10B981" />
                                        <span style={{ color: '#10B981' }}>Copiado</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copiar</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Estado de carga */}
                    {loading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid var(--ds-border, #CBD5E1)'
                        }}>
                          <img src={bonyAvatarImg} alt="Bony" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{
                          background: 'var(--ds-bg-surface, #FFFFFF)',
                          border: '1px solid var(--ds-border, #E2E8F0)',
                          padding: '8px 14px',
                          borderRadius: '14px 14px 14px 2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: 'var(--ds-text-secondary, #64748B)'
                        }}>
                          <span className="bony-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                          <span>Bony está analizando los datos...</span>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        color: '#991B1B',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{error}</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* INPUT Y ENVÍO / O BANNER DE SOLO LECTURA */}
                  {conversationStatus === 'COMPLETED' ? (
                    <div style={{
                      padding: '12px 14px',
                      background: 'var(--ds-bg-surface, #FFFFFF)',
                      borderTop: '1px solid var(--ds-border, #E2E8F0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--ds-text-muted, #64748B)' }}>
                        Conversación finalizada en modo de lectura.
                      </span>
                      <button
                        type="button"
                        onClick={handleNewConversation}
                        style={{
                          background: 'var(--ds-primary, #EF4444)',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 3px rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        <Plus size={13} />
                        <span>Nueva conversación</span>
                      </button>
                    </div>
                  ) : (
                    <div 
                      style={{
                        padding: '10px 12px',
                        background: 'var(--ds-bg-surface, #FFFFFF)',
                        borderTop: '1px solid var(--ds-border, #E2E8F0)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '8px',
                        flexShrink: 0
                      }}
                    >
                      <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDownInput}
                        placeholder="Pregúntale a Bony... (Enter para enviar)"
                        rows={1}
                        disabled={loading}
                        style={{
                          flex: 1,
                          resize: 'none',
                          border: '1px solid var(--ds-border, #CBD5E1)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          lineHeight: '1.4',
                          outline: 'none',
                          background: 'var(--ds-bg-base, #F8FAFC)',
                          color: 'var(--ds-text-primary, #0F172A)',
                          fontFamily: 'inherit',
                          minHeight: '38px',
                          maxHeight: '120px'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--ds-primary, #EF4444)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--ds-border, #CBD5E1)'; }}
                      />

                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || loading}
                        style={{
                          background: !inputValue.trim() || loading ? 'var(--ds-border, #CBD5E1)' : 'var(--ds-primary, #EF4444)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: !inputValue.trim() || loading ? 'not-allowed' : 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.2s ease'
                        }}
                        title="Enviar mensaje"
                        aria-label="Enviar mensaje a Bony"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
