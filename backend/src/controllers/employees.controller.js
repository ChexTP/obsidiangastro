import { FRONTEND_URL } from "../config.js";
import {
  acceptInvitation,
  countActiveOwners,
  findMembershipById,
  inviteEmployee,
  listEmployeesByTenant,
  updateMembership,
} from "../models/employees.model.js";

const roles = ["owner", "admin", "cashier", "waiter", "kitchen", "auditor"];
const statuses = ["active", "invited", "suspended"];

export const getEmployees = async (req, res) => {
  try {
    res.json(await listEmployeesByTenant(req.tenantId));
  } catch (error) {
    res.status(500).json({ message: "Error al obtener empleados", error: error.message });
  }
};

export const postInvitation = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const displayName = req.body.displayName?.trim();
    const role = req.body.role;
    if (!email || !email.includes("@") || !displayName || !roles.includes(role)) {
      return res.status(400).json({ message: "Correo, nombre y rol valido son obligatorios" });
    }
    if (role === "owner" && req.membership.role !== "owner") {
      return res.status(403).json({ message: "Solo un propietario puede invitar propietarios" });
    }

    const invitation = await inviteEmployee({
      accessToken: req.accessToken,
      tenantId: req.tenantId,
      email,
      displayName,
      role,
      redirectTo: `${FRONTEND_URL}/accept-invitation`,
    });
    res.status(201).json({ message: "Invitacion enviada correctamente", data: invitation });
  } catch (error) {
    const status = error.message?.toLowerCase().includes("limit") ? 409 : 400;
    res.status(status).json({ message: "No fue posible invitar al empleado", error: error.message });
  }
};

export const patchEmployee = async (req, res) => {
  try {
    const { role, status } = req.body;
    if (role !== undefined && !roles.includes(role)) return res.status(400).json({ message: "Rol invalido" });
    if (status !== undefined && !statuses.includes(status)) return res.status(400).json({ message: "Estado invalido" });
    if (role === undefined && status === undefined) return res.status(400).json({ message: "No hay cambios para aplicar" });

    const target = await findMembershipById({ tenantId: req.tenantId, membershipId: req.params.id });
    if (!target) return res.status(404).json({ message: "Empleado no encontrado" });
    if (req.membership.role === "admin" && (target.role === "owner" || role === "owner")) {
      return res.status(403).json({ message: "Un administrador no puede modificar propietarios" });
    }
    if (target.role === "owner" && (role !== undefined && role !== "owner" || status === "suspended")) {
      if (await countActiveOwners(req.tenantId) <= 1) {
        return res.status(409).json({ message: "La cuenta debe conservar al menos un propietario activo" });
      }
    }

    const employee = await updateMembership({
      tenantId: req.tenantId,
      membershipId: req.params.id,
      role,
      status,
    });
    res.json({ message: "Empleado actualizado correctamente", data: employee });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar empleado", error: error.message });
  }
};

export const postAcceptInvitation = async (req, res) => {
  try {
    if (!req.body.tenantId) return res.status(400).json({ message: "tenantId es obligatorio" });
    const result = await acceptInvitation({ accessToken: req.accessToken, tenantId: req.body.tenantId });
    res.json({ message: "Invitacion aceptada correctamente", data: result });
  } catch (error) {
    res.status(400).json({ message: "No fue posible aceptar la invitacion", error: error.message });
  }
};
