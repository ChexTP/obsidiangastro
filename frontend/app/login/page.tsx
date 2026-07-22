"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiRequest } from "../lib/api";
import { saveSession, saveTenant } from "../lib/session";

type LoginResponse = {
  session: { accessToken: string; refreshToken: string; expiresAt: number };
};
type ProfileResponse = { memberships: Array<{ tenant_id: string }> };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST", body: JSON.stringify({ email, password }),
      });
      saveSession(result.session);
      const profile = await apiRequest<ProfileResponse>("/auth/me", {
        headers: { Authorization: `Bearer ${result.session.accessToken}` },
      });
      if (profile.memberships.length === 0) return router.replace("/onboarding");
      saveTenant(profile.memberships[0].tenant_id);
      router.replace("/");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No fue posible iniciar sesión");
    } finally { setLoading(false); }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link href="/" className="auth-brand"><span>O</span><strong>Obsidian Mesa</strong></Link>
        <div className="story-copy"><span className="eyebrow light">GESTIÓN SIN COMPLICACIONES</span><h1>Tu restaurante,<br />en orden cada día.</h1><p>Pedidos, caja, equipo e informes claros en un solo lugar.</p></div>
        <div className="story-points"><span>01</span><p><strong>Menos pasos, más control.</strong><small>Diseñado para que tu equipo aprenda rápido.</small></p></div>
        <small className="auth-copyright">© 2026 Obsidian Mesa</small>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="auth-kicker">BIENVENIDO DE NUEVO</span>
          <h2>Inicia sesión</h2>
          <p>Ingresa para continuar administrando tu restaurante.</p>
          <form onSubmit={submit} className="auth-form">
            <label>Correo electrónico<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@restaurante.com" autoComplete="email" required /></label>
            <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" required /></label>
            <div className="form-row"><label className="check-label"><input type="checkbox" /> Recordarme</label><Link href="/forgot-password">¿Olvidaste tu contraseña?</Link></div>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <button className="auth-submit" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}<span>→</span></button>
          </form>
          <div className="auth-divider"><span>o</span></div>
          <p className="auth-switch">¿Aún no tienes una cuenta? <Link href="/register">Crear cuenta gratis</Link></p>
        </div>
      </section>
    </main>
  );
}
