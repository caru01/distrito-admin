import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Contact, FileBarChart, LayoutDashboard, Megaphone, MessageCircle, Settings, Tags, Workflow } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { API_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import CrmDashboard from './crm/CrmDashboard';
import CrmContacts from './crm/CrmContacts';
import CrmInbox from './crm/CrmInbox';
import CrmMarketing from './crm/CrmMarketing';

const SECTIONS = [
  { key:'dashboard',label:'Dashboard',path:'/admin/crm',icon:LayoutDashboard,permission:'ver' },
  { key:'contactos',label:'Contactos',path:'/admin/crm/contactos',icon:Contact,permission:'contactos' },
  { key:'conversaciones',label:'Conversaciones',path:'/admin/crm/conversaciones',icon:MessageCircle,permission:'conversaciones' },
  { key:'segmentos',label:'Segmentos',path:'/admin/crm/segmentos',icon:Tags,permission:'segmentos' },
  { key:'campanas',label:'Campañas',path:'/admin/crm/campanas',icon:Megaphone,permission:'campanas' },
  { key:'automatizaciones',label:'Automatizaciones',path:'/admin/crm/automatizaciones',icon:Workflow,permission:'automatizaciones' },
  { key:'plantillas',label:'Plantillas',path:'/admin/crm/plantillas',icon:Bot,permission:'campanas' },
  { key:'reportes',label:'Reportes',path:'/admin/crm/reportes',icon:FileBarChart,permission:'reportes' },
  { key:'configuracion',label:'Configuración',path:'/admin/crm/configuracion',icon:Settings,permission:'configurar' },
];

export default function AdminCRM() {
  const location = useLocation();
  const { hasPermission } = useContext(AuthContext);
  const [notice, setNotice] = useState(null);
  const [revision, setRevision] = useState(0);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  const section = useMemo(() => {
    const part = location.pathname.split('/').filter(Boolean)[2];
    return part || 'dashboard';
  }, [location.pathname]);

  const notify = (type, text) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  useEffect(() => {
    const controller = new AbortController();
    let reconnect;
    let lastEventId = '';

    const connect = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${sessionStorage.getItem('distrito_admin_token')}`,
        };
        if (lastEventId) {
          headers['Last-Event-ID'] = lastEventId;
        }
        const response = await fetch(`${API_URL}/realtime/stream`, {
          headers,
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error('realtime');
        setRealtimeConnected(true);
        // Al reconectar, incrementar revision para sincronizar cualquier cambio ocurrido durante la desconexión
        if (lastEventId) {
          setRevision((v) => v + 1);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const packets = buffer.split('\n\n');
          buffer = packets.pop() || '';
          for (const packet of packets) {
            const idMatch = packet.match(/^id:\s*(.+)$/m);
            if (idMatch?.[1]) {
              lastEventId = idMatch[1].trim();
            }
            const eventName = packet.match(/^event:\s*(.+)$/m)?.[1]?.trim() || '';
            if (eventName.startsWith('crm.') || eventName.startsWith('whatsapp.')) {
              let parsedData = null;
              const dataMatch = packet.match(/^data:\s*(.+)$/m);
              if (dataMatch?.[1]) {
                try {
                  parsedData = JSON.parse(dataMatch[1]);
                } catch {}
              }
              setLastRealtimeEvent({
                eventName,
                data: parsedData,
                receivedAt: Date.now(),
              });
              setRevision((v) => v + 1);
            }
          }
        }
        if (!controller.signal.aborted) {
          setRealtimeConnected(false);
          reconnect = setTimeout(connect, 2000);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setRealtimeConnected(false);
          reconnect = setTimeout(connect, 3000);
        }
      }
    };

    connect();
    return () => {
      controller.abort();
      clearTimeout(reconnect);
    };
  }, []);

  const visible = SECTIONS.filter((item) => hasPermission('CRM', item.permission));
  return (
    <div className="ds-page crm-page">
      <header className="ds-page-header">
        <div>
          <span className="ds-page-kicker">Relación comercial unificada</span>
          <h1 className="ds-page-title">CRM Distric House</h1>
          <p className="ds-page-subtitle">
            Conversación, cliente, pedido, campaña y conversión conectados a una sola fuente de verdad.
          </p>
        </div>
        <div className="crm-realtime-pill" title={realtimeConnected ? 'Conectado al stream SSE en tiempo real' : 'Reconectando stream en tiempo real…'}>
          <Activity size={16} />
          <span>{realtimeConnected ? 'Tiempo real activo' : 'Sincronizando…'}</span>
        </div>
      </header>
      <nav className="crm-nav" aria-label="Secciones CRM">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = section === item.key || (item.key === 'dashboard' && section === 'crm');
          return (
            <Link key={item.key} to={item.path} className={active ? 'active' : ''}>
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {notice && (
        <div className={`ds-inline-alert ds-inline-alert-${notice.type === 'success' ? 'success' : 'danger'}`}>
          {notice.text}
        </div>
      )}
      {(section === 'dashboard' || section === 'crm') && <CrmDashboard revision={revision} notify={notify} />}
      {section === 'contactos' && <CrmContacts revision={revision} notify={notify} />}
      {section === 'conversaciones' && (
        <CrmInbox revision={revision} lastRealtimeEvent={lastRealtimeEvent} notify={notify} />
      )}
      {['segmentos', 'campanas', 'automatizaciones', 'plantillas', 'reportes', 'configuracion'].includes(section) && (
        <CrmMarketing section={section} revision={revision} notify={notify} />
      )}
    </div>
  );
}
