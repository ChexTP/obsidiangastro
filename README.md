# Obsidian Gastro

SaaS de gestión para restaurantes con pedidos, menú del día, control de mesas, cocina, caja, informes y comprobantes térmicos.

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

## Estado

El proyecto se encuentra en preparación para pruebas piloto en restaurantes.
