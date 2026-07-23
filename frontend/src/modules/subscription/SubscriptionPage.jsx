import {useEffect,useMemo,useState} from "react";
import PageHeader from "../../components/PageHeader";
import LoadingState from "../../components/LoadingState";
import {getCurrentSubscription,getDeviceSessions,revokeDeviceSession} from "../../controllers/subscriptionController";

const labels={mobile:"Aplicación móvil",admin_web:"Administrador web",cashier_web:"Caja web",kitchen_web:"Cocina web"};
const keys={mobile:"mobile_concurrent_sessions",admin_web:"admin_web_sessions",cashier_web:"cashier_web_sessions",kitchen_web:"kitchen_web_sessions"};
const states={trialing:"Prueba gratuita",active:"Activa",past_due:"Pago pendiente",grace_period:"Periodo de gracia",suspended:"Suspendida",cancelled:"Cancelada",archived:"Archivada"};
const fmt=value=>value?new Intl.DateTimeFormat("es-CO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"Sin fecha";

export default function SubscriptionPage(){
 const[sub,setSub]=useState(null),[sessions,setSessions]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=()=>Promise.all([getCurrentSubscription(),getDeviceSessions()]).then(([a,b])=>{setSub(a);setSessions(b);setError("")}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
 useEffect(()=>{load()},[]);
 const limits=useMemo(()=>({...sub?.plans?.limits,...sub?.overrides}),[sub]);
 const active=sessions.filter(s=>!s.revoked_at&&Date.now()-new Date(s.last_seen_at).getTime()<300000);
 const close=async id=>{if(!window.confirm("¿Cerrar esta sesión y liberar su cupo?"))return;try{await revokeDeviceSession(id);load()}catch(e){setError(e.message)}};
 if(loading)return <div className="content"><LoadingState label="Cargando suscripción"/></div>;
 return <div className="content"><PageHeader eyebrow="CUENTA" title="Plan y dispositivos" description="Consulta los límites contratados y controla las conexiones activas."/>{error&&<div className="form-alert module-alert">{error}</div>}
  <section className="subscription-summary surface-card"><div><span className={`subscription-status ${sub?.status}`}>{states[sub?.status]||sub?.status}</span><h2>{sub?.plans?.name||"Plan"}</h2><p>{sub?.plans?.description}</p></div><div className="subscription-date"><small>{sub?.status==="trialing"?"La prueba termina":"Periodo vigente hasta"}</small><strong>{fmt(sub?.trial_ends_at||sub?.current_period_ends_at)}</strong></div></section>
  <section className="limit-grid">{Object.entries(keys).map(([kind,key])=>{const used=active.filter(s=>s.kind===kind).length,total=Number(limits?.[key]||0);return <article className="surface-card" key={kind}><span>{labels[kind]}</span><strong>{used} <small>de {total}</small></strong><div className="usage-bar"><i style={{width:`${total?Math.min(100,used/total*100):0}%`}}/></div></article>})}</section>
  <section className="surface-card device-panel"><div className="table-heading"><div><h2>Dispositivos y sesiones</h2><p>Se considera activa una conexión con actividad durante los últimos 5 minutos.</p></div><button className="secondary-button" onClick={load}>Actualizar</button></div><div className="device-list">{sessions.length===0?<p className="cash-history-empty">Todavía no hay dispositivos registrados.</p>:sessions.map(item=>{const online=active.some(s=>s.id===item.id);return <article key={item.id}><span className={`device-state ${online?"online":"offline"}`}/><div><strong>{item.device_name||"Dispositivo sin nombre"}</strong><small>{labels[item.kind]||item.kind} · Última actividad: {fmt(item.last_seen_at)}</small></div><span className={`status-pill ${online?"available":"cancelled"}`}>{online?"Activo":"Inactivo"}</span>{online?<button className="danger-button" onClick={()=>close(item.id)}>Cerrar sesión</button>:<span/>}</article>})}</div></section>
 </div>;
}
