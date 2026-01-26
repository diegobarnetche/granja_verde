# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GRANJA VERDE is a farm management web application for tracking expenses (Gastos), sales (Ventas), collections (Cobros), and orders (Pedidos). Built with Express.js backend, React frontend, and PostgreSQL database.

## Current Project Status

### Modules Status
| Module | Backend | Frontend | Status |
|--------|---------|----------|--------|
| Ventas | OK | OK | Funcional |
| Cobros | OK | OK | Funcional |
| Gastos | OK | OK | Funcional |
| Pedidos | - | Placeholder | Pendiente desarrollo |

### Pending Tasks
- [ ] PWA: Implementar Nivel 0 (instalable, sin offline)
- [ ] PWA: Futuro - Nivel 1 (cache de catálogos para lectura offline)
- [ ] Pedidos: Desarrollar módulo completo

### Recent Changes (2026-01-16)
- Fix: Autocomplete muestra lista completa al hacer foco
- Fix: Campo ABONADO no crashea al borrar valor
- Fix: Estados de pago corregidos (PAGO PENDIENTE, PAGO PARCIAL, PAGO, CANCELADO)
- Add: Módulo Cobros completo (backend + frontend)

## Development Commands

### Local Development
```bash
# Backend (runs on http://localhost:3001)
cd backend && npm install && npm run dev

# Frontend (runs on http://localhost:5173)
cd frontend && npm install && npm run dev
```

### Docker
```bash
docker-compose up --build
```

### Production (Ubuntu Server)
```bash
cd ~/granja_verde
git pull origin main
docker-compose up --build -d
```

## Architecture

### Backend Structure (MVC Pattern)
```
backend/
├── server.js                 # Express entry point, database pool setup
└── modules/
    ├── gastos/               # Expense management
    │   ├── gastos.routes.js
    │   ├── gastos.controller.js
    │   ├── gastos.service.js
    │   └── gastos.sql.js
    ├── ventas/               # Sales module
    │   ├── ventas.routes.js
    │   ├── ventas.controller.js
    │   ├── ventas.service.js
    │   ├── ventas.validators.js
    │   └── ventas.sql.js
    └── cobros/               # Collections/payments module
        ├── cobros.routes.js
        ├── cobros.controller.js
        ├── cobros.service.js
        ├── cobros.validators.js
        └── cobros.sql.js
```

### Module Pattern
Routes use factory functions that receive the database pool:
```javascript
function createModuleRouter(pool) {
  const router = express.Router();
  const controller = new Controller(pool);
  // routes...
  return router;
}
```

### Frontend Structure
```
frontend/src/
├── App.jsx              # Router (react-router-dom)
├── pages/
│   ├── Ventas.jsx       # 4-step wizard for sales
│   ├── Cobros.jsx       # 4-step wizard for collections
│   ├── Gastos.jsx       # Expense form + list
│   └── Pedidos.jsx      # Placeholder "Módulo no disponible"
└── components/
    └── Navbar.jsx       # Navigation (Ventas, Cobros, Gastos, Pedidos)
```

## Database

- **Schema**: `"GV"` (quoted identifiers required)
- **Key tables**: VENTAS, ING_TRANSACCIONES, ING_DETALLE, CLIENTE, PRODUCTO, GASTO
- **Important**: Product primary key is `ITEM` (BIGINT), NOT `ID_PRODUCTO`
- **UMD**: Unit multiplier for quantity calculations (CANTIDAD_UNIDADES = CANTIDAD × UMD)

### VENTAS.ESTADO Check Constraint
```sql
CHECK ("ESTADO" IN ('PAGO PENDIENTE','PAGO PARCIAL','PAGO','CANCELADO'))
```

## API Endpoints

### Ventas
- `GET /api/ventas` - List sales
- `GET /api/ventas/:venta_id` - Get sale by ID
- `POST /api/ventas` - Create sale
- `PUT /api/ventas/:venta_id` - Update sale
- `GET /api/ventas/catalogos` - Get clients/products lookups

### Cobros
- `GET /api/cobros/pending-clients` - Clients with pending balance
- `GET /api/cobros/client/:id/ventas` - Pending sales for client
- `GET /api/cobros/client/:id/historial` - Payment history
- `POST /api/cobros/register-payment` - Register payment

### Gastos
- `GET/POST/PUT/DELETE /api/gastos`

## Business Rules

### Cobros - Payment Allocation
- Uses FIFO (First In, First Out) by FECHA_VENTA
- Payments distributed across oldest sales first
- Multiple payment lines allowed per transaction (e.g., $2000 cash + $1000 debit)

### Estado Calculation
```javascript
if (saldoPendiente <= 0) return 'PAGO';
if (saldoPendiente < total) return 'PAGO PARCIAL';
return 'PAGO PENDIENTE';
```

## Environment Configuration

Backend requires `.env` file:
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=database_name
```

## Git Configuration
- **Repo**: https://github.com/diegobarnetche/granja_verde.git
- **User**: diego barnetche
- **Email**: barnetchediego@gmail.com
