import { listMembershipsByUser } from "../models/accounts.model.js";
import { PUBLIC_WEB_URL } from "../config.js";
import { loginUser, registerUser, requestPasswordReset } from "../models/auth.model.js";

const validEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const sessionResponse = (data) => ({
  user: data.user ? { id: data.user.id, email: data.user.email } : null,
  session: data.session ? {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
  } : null,
});

export const postRegister = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const displayName = req.body.displayName?.trim();
    if (!validEmail(email) || !displayName || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Nombre, correo valido y contraseña de al menos 8 caracteres son obligatorios" });
    }
    const data = await registerUser({
      email,
      password,
      displayName,
      redirectTo: `${PUBLIC_WEB_URL}/login?confirmed=true`,
    });
    res.status(201).json({
      message: data.session ? "Cuenta creada correctamente" : "Revisa tu correo para confirmar la cuenta",
      ...sessionResponse(data),
    });
  } catch (error) {
    res.status(400).json({ message: "No fue posible crear la cuenta", error: error.message });
  }
};

export const postLogin = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    if (!validEmail(email) || !password) return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
    const data = await loginUser({ email, password });
    res.json({ message: "Inicio de sesion correcto", ...sessionResponse(data) });
  } catch (error) {
    res.status(401).json({ message: "Credenciales invalidas o cuenta sin confirmar", error: error.message });
  }
};

export const postForgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!validEmail(email)) return res.status(400).json({ message: "Correo valido obligatorio" });
    await requestPasswordReset({ email, redirectTo: `${PUBLIC_WEB_URL}/reset-password` });
    res.json({ message: "Si el correo existe, recibiras instrucciones para recuperar tu contraseña" });
  } catch (error) {
    res.status(400).json({ message: "No fue posible solicitar la recuperacion", error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const memberships = await listMembershipsByUser(req.user.id);
    res.json({ user: req.user, memberships });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el perfil", error: error.message });
  }
};
