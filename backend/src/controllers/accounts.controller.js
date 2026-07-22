import { createRestaurantAccount, getRestaurantProfile, listMembershipsByUser, updateRestaurantProfile } from "../models/accounts.model.js";

const validateOnboarding = (body) => {
  const businessName = body.businessName?.trim();
  const restaurantName = body.restaurantName?.trim();
  const branchName = body.branchName?.trim() || "Sede principal";
  if (!businessName || businessName.length < 2 || businessName.length > 120) {
    return "El nombre de la empresa debe tener entre 2 y 120 caracteres";
  }
  if (!restaurantName || restaurantName.length < 2 || restaurantName.length > 120) {
    return "El nombre del restaurante debe tener entre 2 y 120 caracteres";
  }
  if (branchName.length < 2 || branchName.length > 120) {
    return "El nombre de la sede debe tener entre 2 y 120 caracteres";
  }
  if (!body.documentType || !body.documentNumber?.trim()) return "El tipo y número de documento son obligatorios";
  if (!body.billingEmail?.includes("@")) return "El correo del restaurante no es válido";
  if (!body.phone?.trim() || !body.address?.trim() || !body.city?.trim()) return "Teléfono, dirección y ciudad son obligatorios";
  return null;
};

export const getProfile = async (req,res) => { try { res.json(await getRestaurantProfile(req.tenantId)); } catch(error){ res.status(500).json({message:"Error al consultar datos del restaurante",error:error.message}); } };
export const patchProfile = async (req,res) => { try {
  const allowedTenant={};for(const key of ["business_name","legal_name","document_type","document_number","verification_digit","billing_email","phone"]){if(req.body.tenant?.[key]!==undefined)allowedTenant[key]=req.body.tenant[key]}
  const allowedRestaurant={};if(req.body.restaurant?.name!==undefined)allowedRestaurant.name=req.body.restaurant.name;
  const allowedBranch={};for(const key of ["name","address","city"]){if(req.body.branch?.[key]!==undefined)allowedBranch[key]=req.body.branch[key]}
  res.json(await updateRestaurantProfile(req.tenantId,{tenant:allowedTenant,restaurant:allowedRestaurant,branch:allowedBranch}));
} catch(error){res.status(400).json({message:"No fue posible actualizar los datos",error:error.message});} };

export const postOnboarding = async (req, res) => {
  try {
    const validationError = validateOnboarding(req.body || {});
    if (validationError) return res.status(400).json({ message: validationError });

    const memberships = await listMembershipsByUser(req.user.id);
    if (memberships.length > 0) {
      return res.status(409).json({ message: "El usuario ya pertenece a una cuenta" });
    }

    const account = await createRestaurantAccount({
      accessToken: req.accessToken,
      accountData: req.body,
    });
    res.status(201).json({ message: "Restaurante creado correctamente", data: account });
  } catch (error) {
    res.status(400).json({ message: "No fue posible crear el restaurante", error: error.message });
  }
};
