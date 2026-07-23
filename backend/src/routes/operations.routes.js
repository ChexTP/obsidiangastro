import {Router} from "express";import {requireAuth} from "../middlewares/auth.middleware.js";import {requireTenant} from "../middlewares/tenant.middleware.js";import * as c from "../controllers/operations.controller.js";
const router=Router();router.use(requireAuth,requireTenant);
router.get("/catalog",c.getCatalog);router.post("/categories",c.postCategory);router.post("/products",c.postProduct);router.patch("/products/:id",c.patchProduct);router.delete("/products/:id",c.deleteProduct);router.put("/products/:id/options",c.putProductOptions);
router.get("/daily-menu",c.getDailyMenu);router.put("/daily-menu",c.putDailyMenu);router.patch("/daily-menu/items/:id",c.patchDailyMenuItem);
router.get("/tables",c.getTables);router.post("/tables",c.postTable);router.patch("/tables/:id",c.patchTable);
router.get("/orders",c.getOrders);router.get("/orders/:id",c.getOrder);router.post("/orders",c.postOrder);router.put("/orders/:id",c.putOrder);router.patch("/orders/:id",c.patchOrder);router.post("/orders/:id/pay",c.postOrderPayment);router.post("/orders/:id/cancel",c.postOrderCancellation);router.post("/orders/:id/refund",c.postOrderRefund);
router.get("/cash",c.getCash);router.get("/cash/history",c.getCashHistory);router.post("/cash/open",c.postCashOpen);router.post("/cash/:id/movements",c.postCashMovement);router.post("/cash/:id/close",c.postCashClose);
router.get("/reports/summary",c.getReportSummary);export default router;
