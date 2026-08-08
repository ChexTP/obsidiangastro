import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { homeForRole } from "../../components/RoleRoute";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(form);
      const role = result.profile.memberships?.[0]?.role;
      navigate(result.needsOnboarding ? "/onboarding" : homeForRole(role, result.isPlatformAdmin), { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return <main className="auth-shell">
    <section className="auth-story">
      <Link to="/" className="auth-brand"><span>O</span><strong>Obsidian Mesa</strong></Link>
      <div className="story-copy"><span className="eyebrow light">GESTIÓN SIN COMPLICACIONES</span><h1>Tu restaurante,<br />en orden cada día.</h1><p>Pedidos, caja, equipo e informes claros en un solo lugar.</p></div>
      <div className="story-points"><span>01</span><p><strong>Menos pasos, más control.</strong><small>Diseñado para que tu equipo aprenda rápido.</small></p></div>
    </section>
    <section className="auth-panel"><div className="auth-form-wrap">
      <span className="auth-kicker">BIENVENIDO DE NUEVO</span><h2>Inicia sesión</h2><p>Ingresa para continuar administrando tu restaurante.</p>
      <form onSubmit={submit} className="auth-form">
        <label>Correo o usuario<input type="text" autoCapitalize="none" autoCorrect="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Contraseña<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <div className="form-row"><span /><Link to="/forgot-password">¿Olvidaste tu contraseña?</Link></div>
        {error && <div className="form-alert">{error}</div>}
        <button className="auth-submit" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}<span>→</span></button>
      </form>
      <div className="auth-divider"><span>o</span></div><p className="auth-switch">¿Aún no tienes una cuenta? <Link to="/register">Crear cuenta gratis</Link></p>
    </div></section>
  </main>;
}
