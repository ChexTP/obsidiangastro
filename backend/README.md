# Backend del SaaS para restaurantes

API Express organizada con el mismo patron de Finca Anaya:

```text
src/
├── controllers/   Reciben peticiones y construyen respuestas
├── middlewares/   Autenticacion, tenant y permisos
├── models/        Consultas y RPC de Supabase
├── routes/        URLs y cadena de middlewares/controladores
├── app.js         Configuracion central de Express
├── config.js      Variables de entorno
├── db.js          Clientes de Supabase
└── index.js       Arranque del servidor
```

Supabase proporciona PostgreSQL, Auth, Storage, Realtime y RLS. La API mantiene las reglas del negocio y nunca expone la clave `service_role`.

## Inicio local

1. Copiar `.env.example` como `.env` y completar las credenciales.
2. Ejecutar `npm install`.
3. Aplicar migraciones con `supabase db push` cuando existan cambios.
4. Ejecutar `npm run dev`.

## Endpoints iniciales

- `GET /api/health`: estado de la API.
- `GET /api/health/database`: comprueba la conexion con Supabase.
- `GET /api/auth/me`: usuario autenticado y cuentas asociadas.
- `POST /api/auth/register`: crea una cuenta con Supabase Auth.
- `POST /api/auth/login`: inicia sesion y devuelve los tokens.
- `POST /api/auth/forgot-password`: solicita recuperacion de contraseña.
- `POST /api/accounts/onboarding`: crea empresa, restaurante, sede, prueba y propietario.
- `GET /api/subscriptions/current`: suscripcion del tenant indicado en `X-Tenant-Id`.
- `GET /api/employees`: empleados del tenant (propietario o administrador).
- `POST /api/employees/invitations`: invita un empleado respetando el limite del plan.
- `PATCH /api/employees/:id`: cambia rol o estado sin dejar la cuenta sin propietario.
- `POST /api/employees/accept-invitation`: acepta una invitacion autenticada.
- `GET /api/sessions`: sesiones y dispositivos del tenant.
- `POST /api/sessions`: abre una sesion respetando el limite simultaneo.
- `POST /api/sessions/:id/heartbeat`: mantiene activa una sesion.
- `DELETE /api/sessions/:id`: cierra una sesion propia o administrada.

Las rutas privadas esperan `Authorization: Bearer <access-token>` emitido por Supabase Auth. Las rutas de una empresa tambien esperan `X-Tenant-Id` y validan la membresia antes de llegar al controlador.
