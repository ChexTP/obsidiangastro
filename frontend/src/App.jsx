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

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
    <Route path="/imprimir/pedido/:id" element={<ProtectedRoute><PrintOrderPage /></ProtectedRoute>} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/pedidos" element={<OrdersPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/mesas" element={<TablesPage />} />
      <Route path="/cocina" element={<KitchenPage />} />
      <Route path="/caja" element={<CashPage />} />
      <Route path="/empleados" element={<EmployeesPage />} />
      <Route path="/informes" element={<ReportsPage />} />
      <Route path="/configuracion" element={<SettingsPage />} />
      <Route index element={<Navigate to="/dashboard" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
