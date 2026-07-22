"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiRequest } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await apiRequest<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setMessage(result.message);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No fue posible enviar el correo"); }
    finally { setLoading(false); }
  };
  return <main className="simple-auth-page"><section><Link href="/login" className="auth-brand dark"><span>O</span><strong>Obsidian Mesa</strong></Link><span className="auth-kicker">RECUPERAR ACCESO</span><h1>Restablece tu contraseña</h1><p>Escribe el correo de tu cuenta y te enviaremos las instrucciones.</p>{message ? <div className="confirmation-box"><span>✓</span><h3>Solicitud enviada</h3><p>{message}</p><Link href="/login">Volver a iniciar sesión</Link></div> : <form onSubmit={submit} className="auth-form"><label>Correo electrónico<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@restaurante.com" required /></label>{error && <div className="form-alert">{error}</div>}<button className="auth-submit" disabled={loading}>{loading ? "Enviando..." : "Enviar instrucciones"}<span>→</span></button><Link className="back-link" href="/login">← Volver al inicio de sesión</Link></form>}</section></main>;
}
