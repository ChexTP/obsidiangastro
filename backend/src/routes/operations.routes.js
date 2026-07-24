import {Router} from "express";
import {requireAuth,requireRoles} from "../middlewares/auth.middleware.js";
import {requireTenant} from "../middlewares/tenant.middleware.js";
import * as c from "../controllers/operations.controller.js";

const router=Router();
router.use(requireAuth,requireTenant);
const roles=(...allowed)=>requireRoles("owner","admin",...allowed);

// Catálogo: todo el equipo puede consultarlo; solo administración lo modifica.
router.get("/catalog",roles("cashier","waiter","kitchen","auditor"),c.getCatalog);
router.post("/categories",roles(),c.postCategory);
router.patch("/categories/:id",roles(),c.patchCategory);
router.delete("/categories/:id",roles(),c.deleteCategory);
router.post("/products",roles(),c.postProduct);
router.patch("/products/:id",roles(),c.patchProduct);
router.delete("/products/:id",roles(),c.deleteProduct);
router.put("/products/:id/options",roles(),c.putProductOptions);
router.get("/templates",roles("cashier","waiter"),c.getTemplates);
router.post("/templates",roles(),c.postTemplate);
router.put("/templates/:id",roles(),c.putTemplate);
router.delete("/templates/:id",roles(),c.deleteTemplate);

// Menú diario: visible para operación, editable únicamente por administración.
router.get("/daily-menu",roles("cashier","waiter","kitchen"),c.getDailyMenu);
router.put("/daily-menu",roles(),c.putDailyMenu);
router.patch("/daily-menu/items/:id",roles(),c.patchDailyMenuItem);

router.get("/tables",roles("cashier","waiter","kitchen"),c.getTables);
router.post("/tables",roles(),c.postTable);
router.patch("/tables/:id",roles(),c.patchTable);

// Meseros y caja crean pedidos; cocina solamente consulta y avanza comandas.
router.get("/orders",roles("cashier","waiter","kitchen","auditor"),c.getOrders);
router.get("/orders/:id",roles("cashier","waiter","kitchen","auditor"),c.getOrder);
router.post("/orders",roles("cashier","waiter"),c.postOrder);
router.put("/orders/:id",roles("cashier","waiter"),c.putOrder);
router.patch("/orders/:id",roles("cashier","kitchen"),c.patchOrder);
router.post("/orders/:id/pay",roles("cashier"),c.postOrderPayment);
router.post("/orders/:id/cancel",roles("cashier","waiter"),c.postOrderCancellation);
router.post("/orders/:id/refund",roles("cashier"),c.postOrderRefund);

router.get("/cash",roles("cashier"),c.getCash);
router.get("/cash/history",roles("cashier"),c.getCashHistory);
router.post("/cash/open",roles("cashier"),c.postCashOpen);
router.post("/cash/:id/movements",roles("cashier"),c.postCashMovement);
router.post("/cash/:id/close",roles("cashier"),c.postCashClose);
router.get("/reports/summary",roles("auditor"),c.getReportSummary);

export default router;
