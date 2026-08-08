import {Navigate} from "react-router-dom";
import {useAuth} from "../context/AuthContext";

export const homeForRole=(role,isPlatformAdmin=false)=>{
  if(isPlatformAdmin)return "/admin-saas";
  return {cashier:"/pedidos",waiter:"/pedidos",kitchen:"/cocina",auditor:"/informes"}[role]||"/dashboard";
};

export default function RoleRoute({roles,children}){
  const{memberships,isPlatformAdmin}=useAuth();const role=memberships[0]?.role;
  if(isPlatformAdmin)return <Navigate to="/admin-saas" replace/>;
  if(!roles.includes(role))return <Navigate to={homeForRole(role,isPlatformAdmin)} replace/>;
  return children;
}
