"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "./lib/api";
import { clearSession, getSession, saveTenant } from "./lib/session";

const navigation = [
  { label: "Inicio", icon: "IN" },
  { label: "Pedidos", icon: "PD" },
  { label: "Menú", icon: "MN" },
  { label: "Mesas", icon: "MS" },
  { label: "Caja", icon: "CJ" },
  { label: "Empleados", icon: "EM" },
  { label: "Informes", icon: "IF" },
];

const setupSteps = [
  { title: "Datos del restaurante", detail: "Nombre, sede y horarios", done: true },
  { title: "Crea tu menú", detail: "Categorías, productos y precios", done: false },
  { title: "Organiza tus mesas", detail: "Zonas, mesas y capacidad", done: false },
  { title: "Invita a tu equipo", detail: "Roles y permisos", done: false },
];

export default function Home() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("Inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState({ businessName: "Restaurante principal", email: "", role: "Propietario" });

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    apiRequest<{ user: { email: string }; memberships: Array<{ tenant_id: string; role: string; tenants?: { business_name?: string } }> }>("/auth/me", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }).then((profile) => {
      if (profile.memberships.length === 0) { router.replace("/onboarding"); return; }
      const membership = profile.memberships[0];
      saveTenant(membership.tenant_id);
      setAccount({
        businessName: membership.tenants?.business_name || "Mi restaurante",
        email: profile.user.email,
        role: membership.role === "owner" ? "Propietario" : membership.role,
      });
      setReady(true);
    }).catch(() => { clearSession(); router.replace("/login"); });
  }, [router]);

  if (!ready) return <main className="app-loading"><div className="brand-mark">O</div><strong>Obsidian Mesa</strong><span>Preparando tu espacio...</span></main>;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`} aria-label="Navegación principal">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">O</div>
          <div>
            <strong>Obsidian Mesa</strong>
            <span>Gestión de restaurantes</span>
          </div>
          <button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">×</button>
        </div>

        <div className="restaurant-switcher">
          <span className="eyebrow">Restaurante actual</span>
          <button type="button">
            <span className="restaurant-avatar">RP</span>
            <span><strong>{account.businessName}</strong><small>Sede principal</small></span>
            <span aria-hidden="true">⌄</span>
          </button>
        </div>

        <nav>
          {navigation.map((item) => (
            <button
              key={item.label}
              className={activeSection === item.label ? "nav-item active" : "nav-item"}
              onClick={() => { setActiveSection(item.label); setMenuOpen(false); }}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.label === "Pedidos" && <span className="nav-count">0</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="trial-card">
            <div><span>Prueba gratuita</span><strong>15 días</strong></div>
            <div className="trial-progress"><span /></div>
            <button>Ver mi plan</button>
          </div>
          <button className="profile-button">
            <span className="profile-avatar">AC</span>
            <span><strong>{account.email.split("@")[0] || "Administrador"}</strong><small>{account.role}</small></span>
            <span aria-hidden="true">···</span>
          </button>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}

      <section className="workspace">
        <header className="topbar">
          <button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">☰</button>
          <div className="breadcrumb"><span>Sede principal</span><i /> <strong>{activeSection}</strong></div>
          <div className="topbar-actions">
            <button className="status-button"><span /> Sistema conectado</button>
            <button className="notification-button" aria-label="Notificaciones">◎<span /></button>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <span className="date-label">MARTES, 21 DE JULIO</span>
              <h1>Buenas tardes, Administrador</h1>
              <p>Esto es lo que está pasando hoy en tu restaurante.</p>
            </div>
            <button className="primary-action"><span>＋</span> Nuevo pedido</button>
          </section>

          <section className="metrics-grid" aria-label="Resumen de hoy">
            <article className="metric-card featured">
              <div className="metric-head"><span>Ventas de hoy</span><span className="trend neutral">Hoy</span></div>
              <strong>$0</strong>
              <small>Aún no hay ventas registradas</small>
              <div className="mini-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
            <article className="metric-card">
              <div className="metric-head"><span>Pedidos</span><span className="metric-symbol amber">01</span></div>
              <strong>0</strong>
              <small>0 en preparación</small>
              <a href="#activity">Ver actividad <span>→</span></a>
            </article>
            <article className="metric-card">
              <div className="metric-head"><span>Promedio por pedido</span><span className="metric-symbol sage">$</span></div>
              <strong>$0</strong>
              <small>Se calcula con tus ventas</small>
              <a href="#reports">Ir a informes <span>→</span></a>
            </article>
            <article className="metric-card">
              <div className="metric-head"><span>Estado de caja</span><span className="metric-symbol blue">CJ</span></div>
              <strong className="closed-status"><span /> Cerrada</strong>
              <small>Ábrela para iniciar operaciones</small>
              <button className="text-action">Abrir caja <span>→</span></button>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="setup-card">
              <div className="card-title-row">
                <div><span className="eyebrow">PRIMEROS PASOS</span><h2>Prepara tu restaurante</h2><p>Completa estos pasos antes de recibir tu primer pedido.</p></div>
                <div className="progress-ring"><strong>25%</strong><span>completo</span></div>
              </div>
              <div className="setup-list">
                {setupSteps.map((step, index) => (
                  <button key={step.title} className={step.done ? "setup-step done" : "setup-step"}>
                    <span className="step-status">{step.done ? "✓" : index + 1}</span>
                    <span><strong>{step.title}</strong><small>{step.detail}</small></span>
                    <span className="step-arrow">→</span>
                  </button>
                ))}
              </div>
            </article>

            <aside className="quick-card">
              <div className="card-title-row compact"><div><span className="eyebrow">ACCESOS RÁPIDOS</span><h2>¿Qué quieres hacer?</h2></div></div>
              <div className="quick-actions">
                <button><span className="quick-icon amber">＋</span><span><strong>Crear producto</strong><small>Agrégalo al menú</small></span><b>→</b></button>
                <button><span className="quick-icon sage">EM</span><span><strong>Invitar empleado</strong><small>Asigna su función</small></span><b>→</b></button>
                <button><span className="quick-icon blue">MS</span><span><strong>Configurar mesas</strong><small>Organiza tu salón</small></span><b>→</b></button>
              </div>
              <div className="help-banner"><span>?</span><div><strong>¿Necesitas ayuda?</strong><small>Consulta la guía de inicio rápido.</small></div><button>Ver guía</button></div>
            </aside>
          </section>

          <section className="activity-card" id="activity">
            <div className="card-title-row compact"><div><span className="eyebrow">ACTIVIDAD</span><h2>Movimiento reciente</h2></div><button className="filter-button">Hoy⌄</button></div>
            <div className="empty-state"><span className="empty-icon">↗</span><div><strong>Tu actividad aparecerá aquí</strong><p>Cuando registres pedidos, pagos o movimientos de caja podrás revisarlos en este espacio.</p></div><button className="secondary-action">Crear primer pedido</button></div>
          </section>
        </div>
      </section>
    </main>
  );
}
