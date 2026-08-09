import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOrders } from "../controllers/operationsController";
import ErrorBoundary from "./ErrorBoundary";
import { connectOperationsRealtime } from "../utils/realtime";

const navigation = [
  ["Inicio", "/dashboard", "IN",["owner","admin"]], ["Pedidos", "/pedidos", "PD",["owner","admin","cashier","waiter"]], ["Menú", "/menu", "MN",["owner","admin"]], ["Plantillas", "/plantillas", "PL",["owner","admin"]],
  ["Mesas", "/mesas", "MS",["owner","admin","cashier","waiter"]], ["Cocina", "/cocina", "CO",["owner","admin","kitchen"]], ["Caja", "/caja", "CJ",["owner","admin","cashier"]], ["Inventario", "/inventario", "IV",["owner","admin","cashier"]],
  ["Empleados", "/empleados", "EM",["owner","admin"]], ["Informes", "/informes", "IF",["owner","admin","auditor"]], ["Configuración", "/configuracion", "CF",["owner","admin"]],
];

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(null);
  const { user, memberships, isPlatformAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const membership = isPlatformAdmin ? null : memberships[0];
  const role = membership?.role;
  const visibleNavigation = isPlatformAdmin ? [] : navigation.filter(([, , , roles]) => roles.includes(role));
  const canManageSubscription = ["owner", "admin"].includes(membership?.role);
  const restaurant = isPlatformAdmin ? "Plataforma Obsidian" : membership?.tenants?.business_name || "Mi restaurante";
  const closeSession = () => { logout(); navigate("/login"); };
  useEffect(() => isPlatformAdmin ? undefined : connectOperationsRealtime(), [isPlatformAdmin]);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (isPlatformAdmin) return; getOrders().then((orders) => { if (active) setPendingOrders(orders.filter((order) => !["paid", "cancelled", "refunded"].includes(order.status)).length); }).catch(() => { if (active) setPendingOrders(null); }); };
    const receiveCount = (event) => { if (active) setPendingOrders(event.detail); };
    refresh();
    window.addEventListener("orders:count", receiveCount);
    window.addEventListener("operations:changed", refresh);
    return () => { active = false; window.removeEventListener("orders:count", receiveCount); window.removeEventListener("operations:changed", refresh); };
  }, [location.pathname, isPlatformAdmin]);
  return <main className="app-shell">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="brand-row"><div className="brand-mark">O</div><div><strong>Obsidian Mesa</strong><span>Gestión de restaurantes</span></div><button className="close-menu" onClick={() => setMenuOpen(false)}>×</button></div>
      <div className="restaurant-switcher"><span className="eyebrow">{isPlatformAdmin?"ADMINISTRACIÓN":"RESTAURANTE ACTUAL"}</span><button><span className="restaurant-avatar">{isPlatformAdmin?"SA":"OM"}</span><span><strong>{restaurant}</strong><small>{isPlatformAdmin?"Gestión del SaaS":"Sede principal"}</small></span>{!isPlatformAdmin&&<span>⌄</span>}</button></div>
      <nav>{visibleNavigation.map(([label, path, icon]) => <NavLink key={path} to={path} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}><span className="nav-icon">{icon}</span>{label}{label === "Pedidos" && <span className={`nav-count ${pendingOrders === null ? "loading" : ""}`}>{pendingOrders === null ? "…" : pendingOrders}</span>}</NavLink>)}{canManageSubscription&&<NavLink to="/suscripcion" onClick={() => setMenuOpen(false)} className={({isActive})=>`nav-item ${isActive?"active":""}`}><span className="nav-icon">PL</span>Mi plan</NavLink>}{isPlatformAdmin&&<NavLink to="/admin-saas" onClick={() => setMenuOpen(false)} className={({isActive})=>`nav-item ${isActive?"active":""}`}><span className="nav-icon">SA</span>Administración SaaS</NavLink>}</nav>
      <div className="sidebar-footer">{canManageSubscription&&<div className="trial-card"><div><span>Suscripción</span><strong>Plan actual</strong></div><div className="trial-progress"><span /></div><button onClick={()=>navigate("/suscripcion")}>Ver mi plan</button></div>}<button className="profile-button" onClick={closeSession}><span className="profile-avatar">AC</span><span><strong>{user?.email?.split("@")[0] || "Administrador"}</strong><small>Cerrar sesión</small></span><span>→</span></button></div>
    </aside>
    {menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
    <section className="workspace"><header className="topbar"><button className="menu-trigger" onClick={() => setMenuOpen(true)}>☰</button><div className="breadcrumb"><span>Sede principal</span><i /><strong>Obsidian Mesa</strong></div><div className="topbar-actions"><button className="status-button"><span /> Sistema conectado</button><button className="notification-button">◎<span /></button></div></header><ErrorBoundary><Outlet /></ErrorBoundary></section>
  </main>;
}
