import{useEffect,useMemo,useState}from"react";
import PageHeader from"../../components/PageHeader";
import LoadingState from"../../components/LoadingState";
import EmptyState from"../../components/EmptyState";
import Modal from"../../components/Modal";
import{getOrders}from"../../controllers/operationsController";

const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const serviceLabels={table:"Para mesa",takeaway:"Para llevar",delivery:"Domicilio"};
const paymentLabels={cash:"Efectivo",card:"Tarjeta",transfer:"Transferencia"};
const money=value=>`$${Number(value||0).toLocaleString("es-CO")}`;

export default function PaidOrdersPage(){
 const[date,setDate]=useState(today()),[search,setSearch]=useState(""),[orders,setOrders]=useState([]),[selected,setSelected]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async(silent=false)=>{if(!silent)setLoading(true);try{const data=await getOrders({history:true,date});const paid=data.filter(order=>order.status==="paid");setOrders(paid);setSelected(current=>current?paid.find(order=>order.id===current.id)||null:null);setError("")}catch(f){setError(f.message)}finally{if(!silent)setLoading(false)}};
 useEffect(()=>{load()},[date]);
 useEffect(()=>{const refresh=()=>load(true);window.addEventListener("operations:changed",refresh);return()=>window.removeEventListener("operations:changed",refresh)},[date]);
 const visible=useMemo(()=>{const term=search.trim().toLowerCase();if(!term)return orders;return orders.filter(order=>String(order.order_number).includes(term)||(order.dining_tables?.name||"").toLowerCase().includes(term)||(order.customer_name||"").toLowerCase().includes(term)||(order.order_items||[]).some(item=>item.product_name?.toLowerCase().includes(term)||(item.selections||[]).some(selection=>selection.name?.toLowerCase().includes(term))))},[orders,search]);
 if(loading)return <div className="content"><PageHeader eyebrow="VENTAS" title="Pedidos pagados"/><section className="surface-card"><LoadingState label="Consultando pedidos pagados..."/></section></div>;
 return <div className="content paid-orders-page"><PageHeader eyebrow="VENTAS" title="Pedidos pagados" description="Consulta ventas cerradas y vuelve a imprimir el recibo o la comanda."/>{error&&<div className="form-alert module-alert">{error}</div>}
  <div className="paid-orders-toolbar"><label>Fecha<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><input className="search-input" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar pedido, mesa, cliente o producto..."/><strong>{visible.length} {visible.length===1?"pedido":"pedidos"}</strong></div>
  <section className="surface-card">{visible.length?<div className="data-list">{visible.map(order=><article key={order.id}><span className="list-avatar amber">#{order.order_number}</span><div><strong>{order.dining_tables?.name||order.customer_name||"Cliente"}</strong><small>{serviceLabels[order.service_type]} · {new Date(order.created_at).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}</small></div><span className="status-pill paid">Pagado</span><strong>{money(order.total)}</strong><div className="order-row-actions"><button className="view-action" onClick={()=>setSelected(order)}>Ver</button><button onClick={()=>window.open(`/imprimir/pedido/${order.id}?tipo=recibo`,"_blank")}>Recibo de pago</button><button onClick={()=>window.open(`/imprimir/pedido/${order.id}?tipo=comanda`,"_blank")}>Comanda</button></div></article>)}</div>:<EmptyState icon="PG" title="No hay pedidos pagados" description="Cambia la fecha o la búsqueda para consultar otras ventas."/>}</section>
  {selected&&<PaidOrderModal order={selected} onClose={()=>setSelected(null)}/>} 
 </div>;
}

function PaidOrderModal({order,onClose}){
 const reference=order.dining_tables?.name||order.customer_name||"Sin referencia";
 return <Modal wide title={`Pedido pagado #${order.order_number}`} description={`${reference} · ${new Date(order.created_at).toLocaleString("es-CO")}`} onClose={onClose}><div className="order-detail"><div className="order-detail-meta"><span><small>Servicio</small><strong>{serviceLabels[order.service_type]}</strong></span><span><small>Referencia</small><strong>{reference}</strong></span><span><small>Total pagado</small><strong>{money(order.total)}</strong></span><span><small>Medio de pago</small><strong>{(order.payments||[]).map(item=>paymentLabels[item.method]||item.method).join(" + ")||"Sin información"}</strong></span></div>{order.notes&&<div className="order-detail-note"><strong>Observaciones</strong><p>{order.notes}</p></div>}<div className="order-detail-items">{(order.order_items||[]).map((item,index)=><article key={item.id||index}><b>{Number(item.quantity)}×</b><div><strong>{item.product_name}</strong>{(item.selections||[]).length>0&&<ul>{item.selections.map((selection,i)=><li key={selection.optionId||selection.productId||i}>{selection.group?`${selection.group}: `:""}{selection.name}</li>)}</ul>}</div><strong>{money(Number(item.unit_price)*Number(item.quantity))}</strong></article>)}</div><div className="order-detail-totals"><p><span>Subtotal</span><b>{money(order.subtotal)}</b></p>{Number(order.service_fee)>0&&<p><span>{order.service_type==="delivery"?"Domicilio":"Empaque"}</span><b>{money(order.service_fee)}</b></p>}<p className="grand"><span>Total pagado</span><b>{money(order.total)}</b></p></div><div className="order-detail-actions"><button className="secondary-button" onClick={()=>window.open(`/imprimir/pedido/${order.id}?tipo=comanda`,"_blank")}>Imprimir comanda</button><button className="primary-action" onClick={()=>window.open(`/imprimir/pedido/${order.id}?tipo=recibo`,"_blank")}>Imprimir recibo de pago</button></div></div></Modal>;
}
