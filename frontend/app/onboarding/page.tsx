"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { getSession, saveTenant } from "../lib/session";

type OnboardingResponse = { data: { tenantId: string; restaurantId: string; branchId: string; trialEndsAt: string } };

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ businessName: "", restaurantName: "", branchName: "Sede principal", currency: "COP", timezone: "America/Bogota" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!getSession()) router.replace("/login"); }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const session = getSession();
    if (!session) return router.replace("/login");
    setLoading(true); setError("");
    try {
      const result = await apiRequest<OnboardingResponse>("/accounts/onboarding", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify(form),
      });
      saveTenant(result.data.tenantId);
      router.replace("/");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible crear el restaurante"); }
    finally { setLoading(false); }
  };

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header"><div className="auth-brand dark"><span>O</span><strong>Obsidian Mesa</strong></div><div><small>PASO 1 DE 3</small><div className="onboarding-progress"><span /></div></div></header>
      <section className="onboarding-card">
        <span className="auth-kicker">CONFIGURACIÓN INICIAL</span>
        <h1>Cuéntanos sobre tu restaurante</h1>
        <p>Con estos datos prepararemos tu espacio de trabajo. Podrás modificarlos después.</p>
        <form onSubmit={submit} className="onboarding-form">
          <label>Nombre de la empresa<span>Puede ser tu nombre o razón social</span><input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Ej. Grupo Sabores SAS" required /></label>
          <label>Nombre del restaurante<span>Así aparecerá para tu equipo</span><input value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} placeholder="Ej. La Mesa del Parque" required /></label>
          <div className="form-columns">
            <label>Primera sede<input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} required /></label>
            <label>Moneda<select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="COP">Peso colombiano (COP)</option></select></label>
          </div>
          <div className="info-note"><span>i</span><p><strong>Tu prueba gratuita comienza hoy.</strong> Tendrás 15 días para explorar todas las funciones del plan base.</p></div>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <button className="auth-submit onboarding-submit" disabled={loading}>{loading ? "Preparando tu restaurante..." : "Crear mi restaurante"}<span>→</span></button>
        </form>
      </section>
      <p className="onboarding-help">¿Necesitas ayuda? <a href="mailto:soporte@obsidianmesa.com">Habla con nosotros</a></p>
    </main>
  );
}
