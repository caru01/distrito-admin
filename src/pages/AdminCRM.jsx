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

export default function AdminCRM(){
  const location=useLocation(); const {hasPermission}=useContext(AuthContext); const [notice,setNotice]=useState(null); const [revision,setRevision]=useState(0);
  const section=useMemo(()=>{const part=location.pathname.split('/').filter(Boolean)[2];return part||'dashboard';},[location.pathname]);
  const notify=(type,text)=>{setNotice({type,text});window.setTimeout(()=>setNotice(null),5000);};
  useEffect(()=>{
    const controller=new AbortController();let reconnect;
    const connect=async()=>{try{const response=await fetch(`${API_URL}/realtime/stream`,{headers:{Authorization:`Bearer ${sessionStorage.getItem('distrito_admin_token')}`},signal:controller.signal});if(!response.ok||!response.body)throw new Error('realtime');const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';while(!controller.signal.aborted){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const packets=buffer.split('\n\n');buffer=packets.pop()||'';for(const packet of packets){const eventName=packet.match(/^event:\s*(.+)$/m)?.[1]||'';if(eventName.startsWith('crm.')||eventName.startsWith('whatsapp.'))setRevision(value=>value+1);}}if(!controller.signal.aborted)reconnect=setTimeout(connect,3000);}catch(error){if(error.name!=='AbortError')reconnect=setTimeout(connect,4000);}};connect();return()=>{controller.abort();clearTimeout(reconnect);};
  },[]);
  const visible=SECTIONS.filter(item=>hasPermission('CRM',item.permission));
  return <div className="ds-page crm-page"><header className="ds-page-header"><div><span className="ds-page-kicker">Relación comercial unificada</span><h1 className="ds-page-title">CRM Distrito BG</h1><p className="ds-page-subtitle">Conversación, cliente, pedido, campaña y conversión conectados a una sola fuente de verdad.</p></div><div className="crm-realtime-pill"><Activity size={16}/><span>Tiempo real activo</span></div></header>
    <nav className="crm-nav" aria-label="Secciones CRM">{visible.map(item=>{const Icon=item.icon;const active=section===item.key||(item.key==='dashboard'&&section==='crm');return <Link key={item.key} to={item.path} className={active?'active':''}><Icon size={17}/><span>{item.label}</span></Link>;})}</nav>
    {notice&&<div className={`ds-inline-alert ds-inline-alert-${notice.type==='success'?'success':'danger'}`}>{notice.text}</div>}
    {(section==='dashboard'||section==='crm')&&<CrmDashboard revision={revision} notify={notify}/>} {section==='contactos'&&<CrmContacts revision={revision} notify={notify}/>} {section==='conversaciones'&&<CrmInbox revision={revision} notify={notify}/>} {['segmentos','campanas','automatizaciones','plantillas','reportes','configuracion'].includes(section)&&<CrmMarketing section={section} revision={revision} notify={notify}/>} </div>;
}
