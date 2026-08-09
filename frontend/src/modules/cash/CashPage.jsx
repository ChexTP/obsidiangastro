import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Modal from "../../components/Modal";
import LoadingState from "../../components/LoadingState";
import { addCashMovement, closeCash, getCash, getCashHistory, getCashProductSales, openCash } from "../../controllers/operationsController";

const summarizeSession = (session) => {
  const movements = session.cash_movements || []; const payments = session.payments || []; const refunds = session.refunds || [];
  const byMethod = (records, method) => records.filter((item) => item.method === method).reduce((sum, item) => sum + Number(item.amount), 0);
  const incomes = movements.filter((item) => item.kind === "income").reduce((sum, item) => sum + Number(item.amount), 0); const expenses = movements.filter((item) => item.kind === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const cash = byMethod(payments, "cash"); const card = byMethod(payments, "card"); const transfer = byMethod(payments, "transfer"); const cashRefunds = byMethod(refunds, "cash"); const refundTotal = refunds.reduce((sum, item) => sum + Number(item.amount), 0);
  const expected = Number(session.opening_amount) + cash + incomes - expenses - cashRefunds; const counted = session.closing_amount === null ? null : Number(session.closing_amount);
  return { cash, card, transfer, sales: cash + card + transfer, refunds: refundTotal, incomes, expenses, expected, counted, difference: counted === null ? null : counted - expected };
};

export default function CashPage() {
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [movementType, setMovementType] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [productSales, setProductSales] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSalesLoading, setProductSalesLoading] = useState(false);
  const applyProductSales = (data) => { const products=data.products||[];setProductSales(products);setSelectedProductId(current=>products.some(product=>product.id===current)?current:(products[0]?.id||"")); };
  const loadProductSales = () => { setProductSalesLoading(true); return getCashProductSales().then(applyProductSales).catch((failure)=>setError(failure.message)).finally(()=>setProductSalesLoading(false)); };
  const load = () => { setLoading(true); return Promise.all([getCash(), getCashHistory(), getCashProductSales()]).then(([data, historyData, salesData]) => { setSession(data.session); setHistory(historyData.sessions || []); applyProductSales(salesData); }).catch((failure) => setError(failure.message)).finally(() => setLoading(false)); };
  useEffect(() => { const refresh=()=>load();load();window.addEventListener("operations:changed",refresh);return()=>window.removeEventListener("operations:changed",refresh); }, []);

  const open = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await openCash({ openingAmount: Number(form.get("base")), notes: form.get("note") }); setOpenModal(false); await load(); } catch (failure) { setError(failure.message); } };
  const registerMovement = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await addCashMovement(session.id, { kind: movementType, amount: Number(form.get("amount")), concept: form.get("concept") }); setMovementType(null); await load(); } catch (failure) { setError(failure.message); } };
  const close = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await closeCash(session.id, { closingAmount: Number(form.get("closingAmount")) }); setCloseModal(false); await load(); } catch (failure) { setError(failure.message); } };

  const base = Number(session?.opening_amount || 0);
  const movements = session?.cash_movements || [];
  const payments = session?.payments || [];
  const refunds = session?.refunds || [];
  const incomes = movements.filter((item) => item.kind === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = movements.filter((item) => item.kind === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const paymentTotal = (method) => payments.filter((item) => item.method === method).reduce((sum, item) => sum + Number(item.amount), 0);
  const cashSales = paymentTotal("cash");
  const cardSales = paymentTotal("card");
  const transferSales = paymentTotal("transfer");
  const totalSales = cashSales + cardSales + transferSales;
  const cashRefunds = refunds.filter((item) => item.method === "cash").reduce((sum, item) => sum + Number(item.amount), 0);
  const refundTotal = refunds.reduce((sum, item) => sum + Number(item.amount), 0);
  const expectedCash = base + cashSales + incomes - expenses - cashRefunds;
  const filteredProductSales=productSales.filter(product=>`${product.name} ${product.category}`.toLowerCase().includes(productSearch.trim().toLowerCase()));
  const selectedProduct=productSales.find(product=>product.id===selectedProductId);

  if (loading) return <div className="content"><PageHeader eyebrow="DINERO" title="Caja" description="Controla aperturas, ventas, ingresos, salidas y cierres." /><section className="surface-card"><LoadingState label="Consultando el turno de caja..." /></section></div>;

  return <div className="content">
    <PageHeader eyebrow="DINERO" title="Caja" description="Controla aperturas, ventas, ingresos, salidas y cierres." action={!session && <button className="primary-action" onClick={() => setOpenModal(true)}>Abrir caja</button>} />
    {error && <div className="form-alert module-alert">{error}</div>}
    <section className={`cash-hero ${session ? "open" : ""}`}><div><span className={`status-pill ${session ? "ready" : "closed"}`}>{session ? "Caja abierta" : "Caja cerrada"}</span><h2>{session ? "Turno en curso" : "Inicia el turno para registrar movimientos"}</h2><p>{session ? `Base inicial: $${base.toLocaleString("es-CO")}` : "Define el efectivo inicial. Los cobros y movimientos quedarán asociados al turno."}</p></div><span className="cash-icon">CJ</span></section>
    <section className="metrics-grid cash-metrics"><article className="metric-card"><div className="metric-head"><span>Ventas del turno</span></div><strong>${totalSales.toLocaleString("es-CO")}</strong><small>{payments.length} {payments.length === 1 ? "registro" : "registros"} · Devoluciones ${refundTotal.toLocaleString("es-CO")}</small></article><article className="metric-card"><div className="metric-head"><span>Efectivo esperado</span></div><strong>${expectedCash.toLocaleString("es-CO")}</strong><small>Base + efectivo + ingresos − salidas − devoluciones</small></article><article className="metric-card"><div className="metric-head"><span>Tarjeta y transferencia</span></div><strong>${(cardSales + transferSales).toLocaleString("es-CO")}</strong><small>Tarjeta ${cardSales.toLocaleString("es-CO")} · Transferencia ${transferSales.toLocaleString("es-CO")}</small></article><article className="metric-card"><div className="metric-head"><span>Salidas</span></div><strong>${expenses.toLocaleString("es-CO")}</strong><small>{movements.filter((item) => item.kind === "expense").length} {movements.filter((item) => item.kind === "expense").length === 1 ? "movimiento" : "movimientos"}</small></article></section>
    {session && <><div className="cash-actions"><button className="secondary-button" onClick={() => setMovementType("income")}>Registrar ingreso</button><button className="secondary-button" onClick={() => setMovementType("expense")}>Registrar salida</button><button className="danger-button" onClick={() => setCloseModal(true)}>Cerrar caja</button></div><section className="surface-card cash-product-counter"><div><span className="eyebrow">CONSULTA RÁPIDA</span><h2>Unidades vendidas en este turno</h2><p>Selecciona un producto para conocer cuántas unidades pagadas se han vendido desde que abriste la caja.</p></div><div className="cash-product-controls"><input className="search-input" value={productSearch} onChange={event=>setProductSearch(event.target.value)} placeholder="Buscar producto..."/><select value={selectedProductId} onChange={event=>setSelectedProductId(event.target.value)}><option value="">Seleccionar producto</option>{filteredProductSales.map(product=><option key={product.id} value={product.id}>{product.name} · {product.category}</option>)}</select><button className="secondary-button" onClick={loadProductSales} disabled={productSalesLoading}>{productSalesLoading?"Actualizando...":"Actualizar conteo"}</button></div><div className="cash-product-result"><strong>{selectedProduct?.quantity||0}</strong><span>{selectedProduct?.quantity===1?"unidad vendida":"unidades vendidas"}</span><small>{selectedProduct?.name||"Selecciona un producto"}</small></div></section>{movements.length > 0 && <section className="surface-card cash-history"><h2>Movimientos manuales del turno</h2>{movements.map((item) => <article key={item.id}><div><strong>{item.concept}</strong><small>{new Date(item.created_at).toLocaleString("es-CO")}</small></div><b className={item.kind}>${Number(item.amount).toLocaleString("es-CO")}</b></article>)}</section>}</>}
    <section className="surface-card cash-session-history"><div className="table-heading"><div><span className="eyebrow">HISTORIAL</span><h2>Cajas cerradas</h2></div><span>{history.length} {history.length === 1 ? "turno" : "turnos"}</span></div>{history.length ? <div className="cash-session-list">{history.map((item) => { const summary = summarizeSession(item); return <article key={item.id}><div><strong>{new Date(item.opened_at).toLocaleDateString("es-CO", { dateStyle: "medium" })}</strong><small>{new Date(item.opened_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} – {new Date(item.closed_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</small></div><span><small>Base</small><b>${Number(item.opening_amount).toLocaleString("es-CO")}</b></span><span><small>Efectivo / tarjeta / transferencia</small><b>${summary.cash.toLocaleString("es-CO")} · ${summary.card.toLocaleString("es-CO")} · ${summary.transfer.toLocaleString("es-CO")}</b></span><span><small>Esperado / contado</small><b>${summary.expected.toLocaleString("es-CO")} · ${summary.counted.toLocaleString("es-CO")}</b></span><span className={summary.difference === 0 ? "balanced" : summary.difference > 0 ? "surplus" : "shortage"}><small>Diferencia</small><b>{summary.difference > 0 ? "+" : ""}${summary.difference.toLocaleString("es-CO")}</b></span></article>; })}</div> : <p className="cash-history-empty">Los cierres de caja aparecerán aquí con su arqueo completo.</p>}</section>
    {openModal && <Modal title="Abrir caja" onClose={() => setOpenModal(false)}><form className="module-form" onSubmit={open}><label>Base inicial<input name="base" type="number" min="0" defaultValue="0" required /></label><label>Observación<textarea name="note" /></label><button className="primary-action">Confirmar apertura</button></form></Modal>}
    {movementType && <Modal title={movementType === "expense" ? "Registrar salida" : "Registrar ingreso"} description={movementType === "expense" ? "Este movimiento aparecerá en los informes de salidas." : "Registra dinero que entra sin corresponder a un pedido."} onClose={() => setMovementType(null)}><form className="module-form" onSubmit={registerMovement}><label>Concepto<input name="concept" placeholder={movementType === "expense" ? "Ej. Compra de gas" : "Ej. Aporte a caja"} required /></label><label>Valor<input name="amount" type="number" min="1" required /></label><button className="primary-action">Guardar movimiento</button></form></Modal>}
    {closeModal && <Modal title="Cerrar caja" description="Cuenta el efectivo físico e ingresa el valor real encontrado." onClose={() => setCloseModal(false)}><form className="module-form" onSubmit={close}><div className="payment-summary"><span>Efectivo esperado</span><strong>${expectedCash.toLocaleString("es-CO")}</strong></div><label>Efectivo contado<input name="closingAmount" type="number" min="0" defaultValue={expectedCash} required /></label><button className="danger-button">Confirmar cierre de caja</button></form></Modal>}
  </div>;
}
