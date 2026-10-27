import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, Sparkles, Send, Trash2, Plus, AlertTriangle, CheckCircle, CheckCircle2,
  RefreshCw, TrendingUp, Archive, Clock, ShieldAlert, Cpu, ArrowRight,
  Check, X, FileText, ChevronRight, Zap, Copy
} from 'lucide-react';
import { API_URL } from '../config/api';
import bonyAvatarImg from '../assets/bony-pinscher.jpg';

function prepareMarkdownContent(content) {
  if (!content || typeof content !== 'string') return '';
  let text = content;
  text = text.replace(/\\\|/g, '|');
  text = text.replace(/([^\n])\n(\|[^\n]+\|\n\|[-:\s|]+\|)/g, '$1\n\n$2');
  return text;
}

export default function AdminBony() {
  const token = sessionStorage.getItem('distrito_admin_token');

  // Estados principales
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'alerts' | 'automations'
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationStatus, setConversationStatus] = useState('ACTIVE');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal confirmación finalizar conversación
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Resumen ejecutivo & alertas
  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [runningAutoId, setRunningAutoId] = useState(null);

  // Acciones pendientes
  const [pendingActions, setPendingActions] = useState([]);
  const [processingActionId, setProcessingActionId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // 1. Cargar resumen ejecutivo y alertas al montar
  const fetchOverviewAndAlerts = useCallback(async () => {
    try {
      const [overviewRes, alertsRes, autoRes, actionsRes] = await Promise.all([
        fetch(`${API_URL}/admin/ai/overview`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/ai/alerts`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/ai/automations`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/ai/actions`, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.overview);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
      if (autoRes.ok) {
        const data = await autoRes.json();
        setAutomations(data.automations || []);
      }
      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setPendingActions(data.actions || []);
      }
    } catch (err) {
      console.warn('Error cargando datos de Bony:', err);
    }
  }, [token]);

  // 2. Cargar lista de conversaciones
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/ai/conversations`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.warn('Error cargando conversaciones:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchOverviewAndAlerts();
    fetchConversations();
  }, [fetchOverviewAndAlerts, fetchConversations]);

  // 3. Seleccionar o cambiar conversación
  const loadConversation = async (convId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/ai/conversations/${convId}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('No se pudo cargar la conversación');
      const data = await res.json();
      setCurrentConversationId(convId);
      const matched = conversations.find(c => c.id === convId);
      setConversationStatus(data.conversation?.status || matched?.status || 'ACTIVE');
      setMessages((data.messages || []).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolCalls: m.tool_calls ? (typeof m.tool_calls === 'string' ? JSON.parse(m.tool_calls) : m.tool_calls) : [],
        createdAt: m.created_at
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setConversationStatus('ACTIVE');
    setMessages([]);
    setError(null);
    setInputValue('');
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
      if (currentConversationId) {
        const res = await fetch(`${API_URL}/admin/ai/conversations/${currentConversationId}/complete`, {
          method: 'POST',
          credentials: 'include',
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

      setShowCompleteModal(false);
      await fetchConversations();
      startNewConversation();
    } catch (err) {
      console.error('Error finalizando conversación:', err);
      setError(err.message || 'Error al finalizar la conversación');
      setShowCompleteModal(false);
    } finally {
      setIsCompleting(false);
    }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/admin/ai/conversations/${convId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (currentConversationId === convId) {
        startNewConversation();
      }
    } catch (err) {}
  };

  // 4. Enviar mensaje a Bony
  const sendMessage = async (customText = null) => {
    const textToSend = customText || inputValue.trim();
    if (!textToSend || loading) return;

    setError(null);
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const payload = {
        message: textToSend,
        conversationId: currentConversationId,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      };

      const res = await fetch(`${API_URL}/admin/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al consultar a Bony');
      }

      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
        fetchConversations();
      }

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        toolCalls: data.executedActions || [],
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
      // Refrescar acciones y alertas por si se generó una propuesta
      fetchOverviewAndAlerts();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // 5. Manejador de teclado accesible
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 6. Aprobar / Rechazar acción propuesta
  const handleApproveAction = async (actionId) => {
    setProcessingActionId(actionId);
    try {
      const res = await fetch(`${API_URL}/admin/ai/actions/${actionId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al aprobar acción');

      // Actualizar lista
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
      fetchOverviewAndAlerts();

      // Añadir mensaje de confirmación en el chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `✅ **Acción aprobada y ejecutada exitosamente**: ${data.result?.message || 'Registrada en el sistema.'}`
      }]);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingActionId(null);
    }
  };

  const handleCancelAction = async (actionId) => {
    setProcessingActionId(actionId);
    try {
      await fetch(`${API_URL}/admin/ai/actions/${actionId}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
    } catch (err) {
    } finally {
      setProcessingActionId(null);
    }
  };

  // 7. Ejecutar automatización manual
  const handleRunAutomation = async (autoId) => {
    setRunningAutoId(autoId);
    try {
      const res = await fetch(`${API_URL}/admin/ai/automations/${autoId}/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.run?.result_summary || 'Automatización ejecutada con éxito');
        fetchOverviewAndAlerts();
      }
    } catch (err) {
      alert('Error ejecutando automatización');
    } finally {
      setRunningAutoId(null);
    }
  };

  // Preguntas sugeridas inteligentes
  const suggestedPrompts = [
    { label: '📊 Ventas del 22 al 25 Octubre', prompt: 'Analízame las ventas, recetas y gastos del 22 al 25 de octubre y dime si el negocio fue rentable' },
    { label: '⚠️ Insumos en Nivel Crítico', prompt: '¿Cuáles insumos están en nivel crítico o por agotarse en el inventario?' },
    { label: '🍔 Receta y Margen Distric Salchi', prompt: '¿Cuál es la receta exacta, costo de ingredientes y margen de la Distric Salchi?' },
    { label: '📦 Estimación de Compras', prompt: 'Estímame las necesidades de compra de insumos para los próximos 3 días basándote en las ventas' },
    { label: '🍳 Pedidos Activos en Cocina', prompt: '¿Cuántos pedidos activos tenemos y hay alguno con retraso en preparación?' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: '16px' }}>
      
      {/* 1. Header con identidad de Bony y KPIs Rápidos */}
      <div className="ds-card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(59,130,246,0.06) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            display: 'grid',
            placeItems: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
          }}>
            <Bot size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--ds-text-primary)' }}>Bony</h1>
              <span className="ds-badge ds-badge-success" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> Gemini Flash Activo
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
              Asistente Inteligente Oficial de Distric House · Analítica, Costos, Stock y Operación
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación del Módulo */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--ds-bg-elevated)', padding: '4px', borderRadius: '10px', border: '1px solid var(--ds-border)' }}>
          <button 
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'chat' ? '700' : '500',
              background: activeTab === 'chat' ? 'var(--ds-primary, #EF4444)' : 'transparent',
              color: activeTab === 'chat' ? '#FFFFFF' : 'var(--ds-text-primary)'
            }}
          >
            Conversación
          </button>
          <button 
            onClick={() => setActiveTab('alerts')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'alerts' ? '700' : '500',
              background: activeTab === 'alerts' ? 'var(--ds-primary, #EF4444)' : 'transparent',
              color: activeTab === 'alerts' ? '#FFFFFF' : 'var(--ds-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Alertas ({alerts.length})
          </button>
          <button 
            onClick={() => setActiveTab('automations')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'automations' ? '700' : '500',
              background: activeTab === 'automations' ? 'var(--ds-primary, #EF4444)' : 'transparent',
              color: activeTab === 'automations' ? '#FFFFFF' : 'var(--ds-text-primary)'
            }}
          >
            Automatizaciones ({automations.length})
          </button>
        </div>

        {/* Mini KPIs Deterministas en Vivo */}
        {overview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid var(--ds-border)', paddingLeft: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', display: 'block' }}>Venta Comida Hoy</span>
              <strong style={{ fontSize: '14px', color: '#22C55E' }}>${Number(overview.venta_comida_hoy).toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', display: 'block' }}>En Cocina</span>
              <strong style={{ fontSize: '14px', color: 'var(--ds-text-primary)' }}>{overview.pedidos_activos_cocina}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', display: 'block' }}>Stock Crítico</span>
              <strong style={{ fontSize: '14px', color: overview.insumos_en_alerta > 0 ? '#EF4444' : '#22C55E' }}>{overview.insumos_en_alerta}</strong>
            </div>
          </div>
        )}
      </div>

      {/* 2. Cuerpo Principal */}
      {activeTab === 'chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          
          {/* Barra Lateral de Conversaciones */}
          <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', padding: '14px', gap: '10px', overflowY: 'auto' }}>
            <button 
              onClick={startNewConversation}
              className="ds-btn ds-btn-primary ds-btn-full"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
            >
              <Plus size={16} /> Nueva Consulta
            </button>

            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px' }}>
              Historial Reciente
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
              {conversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 8px', color: 'var(--ds-text-muted)', fontSize: '12px' }}>
                  Sin historial previo
                </div>
              ) : (
                conversations.map(conv => {
                  const isActive = currentConversationId === conv.id;
                  const isCompleted = conv.status === 'COMPLETED';
                  return (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: isActive ? 'var(--ds-bg-elevated)' : 'transparent',
                        border: isActive ? '1px solid var(--ds-border)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        fontSize: '12.5px',
                        color: isActive ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                        fontWeight: isActive ? '600' : '400'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '2px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={conv.title}>
                          {conv.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isCompleted ? 'rgba(100, 116, 139, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: isCompleted ? 'var(--ds-text-muted)' : '#16A34A',
                            fontWeight: '600'
                          }}>
                            {isCompleted ? 'Finalizada' : 'Activa'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                        title="Eliminar conversación"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Área de Chat Conversacional */}
          <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', position: 'relative' }}>
            
            {/* Modal de confirmación para finalizar conversación */}
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
                  zIndex: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
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
                    maxWidth: '380px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--ds-text-primary)' }}>
                        ¿Finalizar conversación?
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                        Asistente Bony
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ds-text-secondary)', lineHeight: '1.5' }}>
                    Esta conversación se guardará en tu historial y podrás consultarla después. Se abrirá una conversación nueva para que puedas seguir trabajando con Bony.
                  </p>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      type="button"
                      disabled={isCompleting}
                      onClick={() => setShowCompleteModal(false)}
                      className="ds-btn ds-btn-secondary"
                      style={{ fontSize: '12.5px', padding: '8px 14px' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isCompleting}
                      onClick={handleConfirmCompleteConversation}
                      className="ds-btn ds-btn-primary"
                      style={{
                        fontSize: '12.5px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isCompleting ? (
                        <span>Finalizando...</span>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          <span>Finalizar y nueva conversación</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Barra superior del área de chat con estado y botón finalizar */}
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--ds-border)',
              background: 'var(--ds-bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ds-text-primary)' }}>
                  {conversations.find(c => c.id === currentConversationId)?.title || 'Conversación actual'}
                </span>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: conversationStatus === 'COMPLETED' ? 'rgba(100, 116, 139, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: conversationStatus === 'COMPLETED' ? 'var(--ds-text-muted)' : '#16A34A',
                  fontWeight: '700'
                }}>
                  {conversationStatus === 'COMPLETED' ? 'Finalizada (Solo lectura)' : 'Activa'}
                </span>
              </div>

              {conversationStatus === 'ACTIVE' && messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  className="ds-btn ds-btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#DC2626',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                  title="Finalizar esta conversación y guardarla en el historial"
                >
                  <CheckCircle2 size={14} />
                  <span>Finalizar conversación</span>
                </button>
              )}
            </div>
            
            {/* Mensajes del Chat */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Bienvenida si no hay mensajes */}
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '600px', padding: '20px 0' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#FFFFFF',
                    margin: '0 auto 16px auto',
                    boxShadow: '0 8px 20px rgba(239,68,68,0.25)'
                  }}>
                    <Bot size={34} />
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--ds-text-primary)' }}>
                    ¡Hola! Soy Bony, tu asistente inteligente
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--ds-text-secondary)', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                    Puedo consultar tus ventas, verificar existencias de inventario, analizar recetas, calcular compras recomendadas y ayudarte a optimizar la rentabilidad de Distric House.
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                    {suggestedPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(p.prompt)}
                        style={{
                          background: 'var(--ds-bg-elevated)',
                          border: '1px solid var(--ds-border)',
                          borderRadius: '999px',
                          padding: '8px 14px',
                          fontSize: '12.5px',
                          color: 'var(--ds-text-primary)',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensajes intercambiados */}
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
                      gap: '10px',
                      maxWidth: '85%',
                      flexDirection: isUser ? 'row-reverse' : 'row'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        background: isUser ? 'var(--ds-primary, #EF4444)' : 'transparent',
                        color: isUser ? '#FFFFFF' : 'var(--ds-text-primary)',
                        border: isUser ? 'none' : '1px solid var(--ds-border)'
                      }}>
                        {isUser ? 'Tú' : <img src={bonyAvatarImg} alt="Bony" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>

                      <div style={{
                        background: isUser ? 'var(--ds-primary, #EF4444)' : 'var(--ds-bg-elevated)',
                        color: isUser ? '#FFFFFF' : 'var(--ds-text-primary)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        lineHeight: '1.5',
                        wordBreak: 'break-word',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}>
                        {isUser ? (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        ) : (
                          <div className="bony-markdown-container">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ node, ...props }) => <p style={{ margin: '0 0 8px 0', lineHeight: '1.5' }} {...props} />,
                                strong: ({ node, ...props }) => <strong style={{ fontWeight: '700', color: 'var(--ds-text-primary)' }} {...props} />,
                                ul: ({ node, ...props }) => <ul style={{ margin: '4px 0 8px 0', paddingLeft: '20px' }} {...props} />,
                                ol: ({ node, ...props }) => <ol style={{ margin: '4px 0 8px 0', paddingLeft: '20px' }} {...props} />,
                                li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                                table: ({ node, ...props }) => (
                                  <div style={{ overflowX: 'auto', margin: '8px 0', borderRadius: '8px', border: '1px solid var(--ds-border)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }} {...props} />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => (
                                  <thead style={{ background: 'var(--ds-bg-elevated)', borderBottom: '2px solid var(--ds-border)' }} {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                  <th style={{ padding: '6px 10px', border: '1px solid var(--ds-border)', fontWeight: '700', textAlign: 'left', whiteSpace: 'nowrap' }} {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                  <td style={{ padding: '6px 10px', border: '1px solid var(--ds-border)' }} {...props} />
                                ),
                                code: ({ node, inline, ...props }) => (
                                  <code style={{ background: 'var(--ds-bg-surface)', padding: '2px 5px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }} {...props} />
                                ),
                                blockquote: ({ node, ...props }) => (
                                  <blockquote style={{ borderLeft: '3px solid var(--ds-primary, #EF4444)', margin: '6px 0', paddingLeft: '10px', color: 'var(--ds-text-secondary)' }} {...props} />
                                )
                              }}
                            >
                              {prepareMarkdownContent(msg.content)}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Badges de Herramientas invocadas por Bony */}
                        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--ds-border)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {msg.toolCalls.map((tc, tcIdx) => (
                              <span key={tcIdx} style={{ fontSize: '11px', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                                ⚡ {tc.tool}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Indicador de carga / typing */}
              {loading && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--ds-bg-elevated)', display: 'grid', placeItems: 'center', border: '1px solid var(--ds-border)' }}>
                    <Bot size={18} color="var(--ds-text-primary)" />
                  </div>
                  <div style={{ background: 'var(--ds-bg-elevated)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--ds-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={14} className="spin-animation" style={{ animation: 'spin 1.2s linear infinite' }} />
                    <span style={{ fontSize: '13px', color: 'var(--ds-text-secondary)' }}>Bony está analizando los datos reales...</span>
                  </div>
                </div>
              )}

              {/* Banner de Error con Reintento */}
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{error}</span>
                  <button 
                    onClick={() => sendMessage(messages[messages.length - 1]?.content)}
                    style={{ background: 'none', border: 'none', color: '#DC2626', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={14} /> Reintentar
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensaje Accesible o Banner de Solo Lectura si está finalizada */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--ds-border)', background: 'var(--ds-bg-surface)' }}>
              {conversationStatus === 'COMPLETED' ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--ds-bg-elevated)',
                  borderRadius: '10px',
                  border: '1px solid var(--ds-border)',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
                    <Archive size={16} color="var(--ds-text-muted)" />
                    <span>Esta conversación fue <strong>finalizada</strong> y está en modo de solo lectura. Todo su historial está conservado.</span>
                  </div>
                  <button 
                    onClick={startNewConversation}
                    className="ds-btn ds-btn-primary ds-btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                  >
                    <Plus size={14} /> Nueva conversación
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregúntale a Bony sobre ventas, insumos, pedidos o recetas... (Enter para enviar)"
                    rows={2}
                    style={{
                      flex: 1,
                      resize: 'none',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--ds-border)',
                      background: 'var(--ds-bg-elevated)',
                      color: 'var(--ds-text-primary)',
                      fontSize: '13.5px',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!inputValue.trim() || loading}
                    className="ds-btn ds-btn-primary"
                    style={{ height: '42px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={16} /> Enviar
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Pestaña: ALERTAS OPERATIVAS */}
      {activeTab === 'alerts' && (
        <div className="ds-card" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#D97706" /> Alertas Operativas y de Stock
          </h2>
          {alerts.length === 0 ? (
            <p style={{ color: 'var(--ds-text-secondary)', fontSize: '13.5px' }}>No hay alertas críticas en este momento. La operación está al día.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alerts.map((al, idx) => (
                <div key={idx} style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: al.severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                  borderLeft: `4px solid ${al.severity === 'critical' ? '#EF4444' : '#F59E0B'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--ds-text-primary)', display: 'block' }}>{al.title}</strong>
                    <span style={{ fontSize: '13px', color: 'var(--ds-text-secondary)' }}>{al.message}</span>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('chat'); sendMessage(`Bony, ayúdame a resolver esta alerta: ${al.title}. ${al.message}`); }}
                    className="ds-btn ds-btn-sm"
                    style={{ fontSize: '12px' }}
                  >
                    Consultar a Bony
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña: AUTOMATIZACIONES */}
      {activeTab === 'automations' && (
        <div className="ds-card" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="#3B82F6" /> Tareas y Automatizaciones de Bony
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
                Reportes programados, alertas preventivas y auditorías de inventario persistidas.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            {automations.map(auto => (
              <div key={auto.id} style={{
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--ds-border)',
                background: 'var(--ds-bg-elevated)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--ds-text-primary)' }}>{auto.name}</strong>
                    <span className={`ds-badge ${auto.is_active ? 'ds-badge-success' : 'ds-badge-warning'}`}>
                      {auto.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)', display: 'block', marginTop: '4px' }}>
                    Frecuencia: {auto.frequency} ({auto.cron_expression || 'Programada'})
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => handleRunAutomation(auto.id)}
                    disabled={runningAutoId === auto.id}
                    className="ds-btn ds-btn-sm ds-btn-primary"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={13} className={runningAutoId === auto.id ? 'spin-animation' : ''} />
                    {runningAutoId === auto.id ? 'Ejecutando…' : 'Ejecutar Ahora'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BANNER FLOTANTE: ACCIONES PENDIENTES DE APROBACIÓN */}
      {pendingActions.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          maxWidth: '420px',
          width: 'calc(100% - 48px)',
          background: 'var(--ds-bg-surface, #FFFFFF)',
          border: '2px solid #3B82F6',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          zIndex: 9999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '4px', borderRadius: '6px' }}>
              <Cpu size={18} />
            </span>
            <strong style={{ fontSize: '14px', color: 'var(--ds-text-primary)' }}>Propuesta de Acción de Bony</strong>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', margin: '0 0 12px 0' }}>
            {pendingActions[0].parameters?.title || 'Bony sugiere una acción operativa.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => handleCancelAction(pendingActions[0].id)}
              disabled={processingActionId === pendingActions[0].id}
              className="ds-btn ds-btn-sm"
              style={{ fontSize: '12px' }}
            >
              Descartar
            </button>
            <button
              onClick={() => handleApproveAction(pendingActions[0].id)}
              disabled={processingActionId === pendingActions[0].id}
              className="ds-btn ds-btn-sm ds-btn-success"
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Check size={14} /> Aprobar y Ejecutar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
