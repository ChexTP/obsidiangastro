# Obsidian Gastro

SaaS de gestión para restaurantes con pedidos, menú del día, control de mesas, cocina, caja, informes y comprobantes térmicos.

El catálogo admite comidas individuales y combos compuestos. Los combos reutilizan comidas existentes, permiten grupos obligatorios u opcionales, adicionales de precio y existencias por componente para cada menú diario.

## Estructura

- `frontend/`: aplicación web en React y Vite.
- `backend/`: API en Node.js y Express.
- `backend/supabase/`: migraciones y configuración de Supabase.

## Desarrollo local

Configura las variables de entorno tomando como referencia los archivos `.env.example` de cada servicio.

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --config vite.config.js
```

El frontend utiliza normalmente `http://localhost:3000` y el backend `http://localhost:4000`.

## Administración SaaS

Configura `SAAS_ADMIN_EMAILS` en el backend con uno o varios correos separados por coma. Esas cuentas podrán abrir `/admin-saas` para gestionar estados, vigencias, planes y límites particulares de cada restaurante. La autorización se valida en el backend.

## Estado

El proyecto se encuentra en preparación para pruebas piloto en restaurantes.
