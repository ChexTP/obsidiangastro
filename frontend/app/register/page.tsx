"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiRequest } from "../lib/api";
import { saveSession } from "../lib/session";

type RegisterResponse = { message: string; session: null | { accessToken: string; refreshToken: string; expiresAt: number } };

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accepted) return setError("Debes aceptar los términos para continuar");
    setError(""); setLoading(true);
    try {
      const result = await apiRequest<RegisterResponse>("/auth/register", { method: "POST", body: JSON.stringify(form) });
      if (result.session) { saveSession(result.session); return router.replace("/onboarding"); }
      setMessage(result.message);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible crear la cuenta"); }
    finally { setLoading(false); }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story register-story">
        <Link href="/" className="auth-brand"><span>O</span><strong>Obsidian Mesa</strong></Link>
        <div className="story-copy"><span className="eyebrow light">15 DÍAS GRATIS</span><h1>Empieza simple.<br />Crece a tu ritmo.</h1><p>Configura tu restaurante y comienza a organizar tu operación.</p></div>
        <div className="story-points"><span>✓</span><p><strong>Sin tarjeta de crédito.</strong><small>Dos conexiones móviles incluidas.</small></p></div>
        <small className="auth-copyright">© 2026 Obsidian Mesa</small>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="auth-kicker">CREA TU CUENTA</span><h2>Comienza gratis</h2><p>Te tomará menos de dos minutos.</p>
          {message ? <div className="confirmation-box"><span>✓</span><h3>Revisa tu correo</h3><p>{message}</p><Link href="/login">Volver al inicio de sesión</Link></div> :
          <form onSubmit={submit} className="auth-form">
            <label>Tu nombre<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Nombre y apellido" autoComplete="name" required /></label>
            <label>Correo electrónico<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nombre@restaurante.com" autoComplete="email" required /></label>
            <label>Contraseña<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" minLength={8} autoComplete="new-password" required /></label>
            <label className="check-label terms"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /> Acepto los términos y la política de privacidad.</label>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <button className="auth-submit" disabled={loading}>{loading ? "Creando cuenta..." : "Crear cuenta gratis"}<span>→</span></button>
          </form>}
          {!message && <p className="auth-switch">¿Ya tienes una cuenta? <Link href="/login">Iniciar sesión</Link></p>}
        </div>
      </section>
    </main>
  );
}
