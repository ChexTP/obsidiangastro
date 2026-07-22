import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getOrder } from "../../controllers/operationsController";
import { useAuth } from "../../context/AuthContext";
import { getRestaurantProfile } from "../../controllers/authController";

const serviceLabels={table:"PARA MESA",takeaway:"PARA LLEVAR",delivery:"DOMICILIO"};
const money=value=>`$${Number(value||0).toLocaleString("es-CO")}`;

export default function PrintOrderPage(){
  const{id}=useParams();const[search]=useSearchParams();const mode=search.get("tipo")==="comanda"?"kitchen":"receipt";const[order,setOrder]=useState(null);const[profile,setProfile]=useState(null);const[error,setError]=useState("");const{memberships}=useAuth();
  useEffect(()=>{Promise.all([getOrder(id),getRestaurantProfile()]).then(([orderData,profileData])=>{setOrder(orderData);setProfile(profileData)}).catch(failure=>setError(failure.message))},[id]);
  const restaurant=profile?.restaurant?.name||memberships[0]?.tenants?.business_name||"Mi restaurante";
  if(error)return <main className="print-loading">{error}</main>;if(!order)return <main className="print-loading">Preparando impresión...</main>;
  const reference=order.dining_tables?.name||order.customer_name||"Sin referencia";
  return <main className={`thermal-page ${mode}`}>
    <div className="print-toolbar"><button onClick={()=>window.print()}>Imprimir ahora</button><span>{mode==="kitchen"?"Comanda de cocina":"Comprobante para cliente"}</span></div>
    <article className="thermal-paper">
      {mode==="receipt"?<>
        <header className="receipt-header"><h1>{restaurant}</h1>{profile?.tenant?.legal_name&&<p>{profile.tenant.legal_name}</p>}{profile?.tenant?.document_number&&<small>{profile.tenant.document_type} {profile.tenant.document_number}{profile.tenant.verification_digit?`-${profile.tenant.verification_digit}`:""}</small>}<p>{profile?.branch?.address}{profile?.branch?.city?` · ${profile.branch.city}`:""}</p>{profile?.tenant?.phone&&<small>Tel. {profile.tenant.phone}</small>}<p>Comprobante de venta · No. {order.order_number}</p></header>
        <div className="receipt-meta"><p><b>Fecha:</b> {new Date(order.created_at).toLocaleString("es-CO")}</p><p><b>Servicio:</b> {serviceLabels[order.service_type]}</p><p><b>Referencia:</b> {reference}</p></div>
        <div className="receipt-items"><div className="receipt-row receipt-label"><span>Producto</span><b>Total</b></div>{order.order_items.map(item=><div className="receipt-row" key={item.id}><span><strong>{Number(item.quantity)} × {item.product_name}</strong>{item.notes&&<small>{item.notes}</small>}<small>{money(item.unit_price)} c/u</small></span><b>{money(Number(item.unit_price)*Number(item.quantity))}</b></div>)}</div>
        <div className="receipt-totals"><p><span>Subtotal alimentos</span><b>{money(order.subtotal)}</b></p>{Number(order.service_fee)>0&&<p><span>{order.service_type==="delivery"?"Costo de domicilio":"Costo de empaque"}</span><b>{money(order.service_fee)}</b></p>}<p className="grand-total"><span>TOTAL</span><b>{money(order.total)}</b></p></div>
        {order.notes&&<div className="receipt-notes"><b>Observación</b><p>{order.notes}</p></div>}
        <footer><strong>Gracias por su compra</strong><p>Este comprobante no equivale a factura electrónica.</p><small>Generado por Obsidian Gastro</small></footer>
      </>:<>
        <header className="kitchen-header"><div><span>COMANDA</span><h1>#{order.order_number}</h1></div><strong>{serviceLabels[order.service_type]}</strong></header>
        <div className="kitchen-reference"><b>{reference}</b><span>{new Date(order.created_at).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}</span></div>
        <div className="kitchen-items">{order.order_items.map(item=><div key={item.id}><b>{Number(item.quantity)}</b><span><strong>{item.product_name}</strong>{item.notes&&<small>NOTA: {item.notes}</small>}</span></div>)}</div>
        {order.notes&&<div className="kitchen-order-note"><b>OBSERVACIÓN DEL PEDIDO</b><p>{order.notes}</p></div>}
        <footer className="kitchen-footer">Pedido creado {new Date(order.created_at).toLocaleString("es-CO")}</footer>
      </>}
    </article>
  </main>;
}
