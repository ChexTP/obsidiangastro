import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import LoadingState from "../../components/LoadingState";
import { createCategory, createProduct, getCatalog, getDailyMenu, saveDailyMenu, updateDailyMenuAvailability } from "../../controllers/operationsController";

const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function MenuPage() {
  const [tab, setTab] = useState("daily");
  const [productOpen, setProductOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [date, setDate] = useState(localDate());
  const [dailyMenu, setDailyMenu] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stockQuantities, setStockQuantities] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCatalog = () => getCatalog().then((data) => { setProducts(data.products); setCategories(data.categories); });
  const loadDaily = (selectedDate = date) => getDailyMenu(selectedDate).then((data) => {
    setDailyMenu(data.menu);
    setSelectedIds(data.menu?.daily_menu_items?.map((item) => item.product_id) || []);
    setStockQuantities(Object.fromEntries((data.menu?.daily_menu_items || []).map((item) => [item.product_id, item.stock_quantity ?? ""])));
  });
  const load = () => { setLoading(true); return Promise.all([loadCatalog(), loadDaily()]).catch((failure) => setError(failure.message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const changeDate = async (value) => { setDate(value); setMessage(""); try { await loadDaily(value); } catch (failure) { setError(failure.message); } };
  const toggleSelection = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const publish = async () => { try { setError(""); const result = await saveDailyMenu(date, selectedIds.map((productId) => ({ productId, quantity: stockQuantities[productId] === "" || stockQuantities[productId] === undefined ? null : Number(stockQuantities[productId]) }))); setDailyMenu(result.menu); setStockQuantities(Object.fromEntries((result.menu?.daily_menu_items || []).map((item) => [item.product_id, item.stock_quantity ?? ""]))); setMessage("Menú del día publicado correctamente"); } catch (failure) { setError(failure.message); } };
  const toggleAvailability = async (item) => { try { await updateDailyMenuAvailability(item.id, item.availability === "available" ? "sold_out" : "available"); await loadDaily(date); } catch (failure) { setError(failure.message); } };
  const addProduct = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await createProduct({ name: form.get("name"), categoryId: form.get("categoryId") || null, price: Number(form.get("price")) }); setProductOpen(false); await loadCatalog(); } catch (failure) { setError(failure.message); } };
  const addCategory = async (event) => { event.preventDefault(); try { await createCategory(new FormData(event.currentTarget).get("name")); setCategoryOpen(false); await loadCatalog(); } catch (failure) { setError(failure.message); } };
  const itemByProduct = new Map((dailyMenu?.daily_menu_items || []).map((item) => [item.product_id, item]));

  if (loading) return <div className="content"><PageHeader eyebrow="CATÁLOGO" title="Menú" description="Conserva todos tus platos y decide cuáles vender cada día." /><section className="surface-card"><LoadingState label="Cargando catálogo y menú del día..." /></section></div>;

  return <div className="content">
    <PageHeader eyebrow="CATÁLOGO" title="Menú" description="Conserva todos tus platos y decide cuáles vender cada día." secondary={<button className="secondary-button" onClick={() => setCategoryOpen(true)}>＋ Categoría</button>} action={<button className="primary-action" onClick={() => setProductOpen(true)}>＋ Nuevo producto</button>} />
    {error && <div className="form-alert module-alert">{error}</div>}
    {message && <div className="success-alert module-alert">✓ {message}</div>}
    <div className="menu-tabs"><button className={tab === "daily" ? "active" : ""} onClick={() => setTab("daily")}>Menú del día</button><button className={tab === "catalog" ? "active" : ""} onClick={() => setTab("catalog")}>Todos los productos</button></div>
    {tab === "daily" ? <section className="daily-menu-layout">
      <article className="surface-card daily-selector"><div className="daily-menu-heading"><div><span className="eyebrow">PROGRAMACIÓN</span><h2>Selecciona los productos disponibles</h2><p>Estos serán los únicos visibles al crear pedidos y en las aplicaciones móviles.</p></div><label>Fecha<input type="date" value={date} onChange={(event) => changeDate(event.target.value)} /></label></div>
        {!products.length ? <EmptyState icon="MN" title="Primero crea productos" description="El catálogo maestro está vacío." action={<button className="primary-action" onClick={() => setProductOpen(true)}>Crear producto</button>} /> : <div className="daily-product-list">{[...categories,{id:null,name:"Otros"}].map((category) => { const entries = products.filter((product) => product.category_id === category.id && product.is_active); if (!entries.length) return null; return <section key={category.id||"other"}><h3>{category.name}</h3>{entries.map((product) => { const checked = selectedIds.includes(product.id); const dailyItem = itemByProduct.get(product.id); return <article key={product.id} className={checked ? "selected" : ""}><button className="daily-check" onClick={() => toggleSelection(product.id)}>{checked ? "✓" : ""}</button><div><strong>{product.name}</strong><small>${Number(product.price).toLocaleString("es-CO")}</small></div>{checked && <label className="stock-input"><span>Unidades</span><input type="number" min="0" step="1" value={stockQuantities[product.id] ?? ""} onChange={(event) => setStockQuantities((current) => ({ ...current, [product.id]: event.target.value }))} placeholder="Sin límite" /></label>}{dailyItem && <button className={`availability-button ${dailyItem.availability}`} onClick={() => toggleAvailability(dailyItem)}>{dailyItem.availability === "available" ? dailyItem.remaining_quantity === null ? "Disponible" : `${dailyItem.remaining_quantity} restantes` : "Agotado"}</button>}</article>})}</section>})}</div>}
        <div className="daily-footer"><span><strong>{selectedIds.length}</strong> productos seleccionados</span><button className="primary-action" onClick={publish}>Publicar menú del día</button></div>
      </article>
      <aside className="surface-card daily-help"><span>HOY</span><h2>{date === localDate() ? "Menú de hoy" : "Menú programado"}</h2><strong>{selectedIds.length} platos</strong><p>La cantidad es opcional. Déjala vacía para productos sin límite o indica las porciones disponibles. Cada pedido descontará automáticamente las unidades controladas.</p></aside>
    </section> : <><div className="module-toolbar"><div className="segmented"><button className="active">Todos <b>{products.length}</b></button>{categories.slice(0, 3).map((category) => <button key={category.id}>{category.name}</button>)}</div><input className="search-input" placeholder="Buscar producto..." /></div><section className="surface-card">{!products.length ? <EmptyState icon="MN" title="Tu catálogo está esperando" description="Crea categorías y productos para armar los menús diarios." /> : <div className="product-grid">{products.map((product) => <article key={product.id}><span className="product-photo">{product.name.slice(0, 2).toUpperCase()}</span><div><small>{product.product_categories?.name || "Sin categoría"}</small><h3>{product.name}</h3><strong>${Number(product.price).toLocaleString("es-CO")}</strong></div><span className="status-pill ready">Guardado</span></article>)}</div>}</section></>}
    {categoryOpen && <Modal title="Nueva categoría" onClose={() => setCategoryOpen(false)}><form className="module-form" onSubmit={addCategory}><label>Nombre<input name="name" required /></label><button className="primary-action">Guardar categoría</button></form></Modal>}
    {productOpen && <Modal title="Crear producto" onClose={() => setProductOpen(false)}><form className="module-form" onSubmit={addProduct}><label>Nombre<input name="name" required /></label><div className="form-columns"><label>Categoría<select name="categoryId"><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Precio<input name="price" type="number" min="0" required /></label></div><button className="primary-action">Guardar producto</button></form></Modal>}
  </div>;
}
