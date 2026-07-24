import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import LoginPage from "./modules/auth/LoginPage";
import RegisterPage from "./modules/auth/RegisterPage";
import ForgotPasswordPage from "./modules/auth/ForgotPasswordPage";
import OnboardingPage from "./modules/onboarding/OnboardingPage";
import DashboardPage from "./modules/dashboard/DashboardPage";
import OrdersPage from "./modules/orders/OrdersPage";
import MenuPage from "./modules/menu/MenuPage";
import TablesPage from "./modules/tables/TablesPage";
import KitchenPage from "./modules/kitchen/KitchenPage";
import CashPage from "./modules/cash/CashPage";
import EmployeesPage from "./modules/employees/EmployeesPage";
import ReportsPage from "./modules/reports/ReportsPage";
import SettingsPage from "./modules/settings/SettingsPage";
import PrintOrderPage from "./modules/print/PrintOrderPage";
import SubscriptionPage from "./modules/subscription/SubscriptionPage";
import SaasAdminPage from "./modules/saas/SaasAdminPage";
import RoleRoute from "./components/RoleRoute";
import InventoryPage from "./modules/inventory/InventoryPage";
import TemplatesPage from "./modules/templates/TemplatesPage";

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
    <Route path="/imprimir/pedido/:id" element={<ProtectedRoute><PrintOrderPage /></ProtectedRoute>} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<RoleRoute roles={["owner","admin"]}><DashboardPage /></RoleRoute>} />
      <Route path="/pedidos" element={<RoleRoute roles={["owner","admin","cashier","waiter"]}><OrdersPage /></RoleRoute>} />
      <Route path="/menu" element={<RoleRoute roles={["owner","admin"]}><MenuPage /></RoleRoute>} />
      <Route path="/plantillas" element={<RoleRoute roles={["owner","admin"]}><TemplatesPage /></RoleRoute>} />
      <Route path="/mesas" element={<RoleRoute roles={["owner","admin","cashier","waiter"]}><TablesPage /></RoleRoute>} />
      <Route path="/cocina" element={<RoleRoute roles={["owner","admin","kitchen"]}><KitchenPage /></RoleRoute>} />
      <Route path="/caja" element={<RoleRoute roles={["owner","admin","cashier"]}><CashPage /></RoleRoute>} />
      <Route path="/inventario" element={<RoleRoute roles={["owner","admin","cashier"]}><InventoryPage /></RoleRoute>} />
      <Route path="/empleados" element={<RoleRoute roles={["owner","admin"]}><EmployeesPage /></RoleRoute>} />
      <Route path="/informes" element={<RoleRoute roles={["owner","admin","auditor"]}><ReportsPage /></RoleRoute>} />
      <Route path="/configuracion" element={<RoleRoute roles={["owner","admin"]}><SettingsPage /></RoleRoute>} />
      <Route path="/suscripcion" element={<RoleRoute roles={["owner","admin"]}><SubscriptionPage /></RoleRoute>} />
      <Route path="/admin-saas" element={<SaasAdminPage />} />
      <Route index element={<Navigate to="/dashboard" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
