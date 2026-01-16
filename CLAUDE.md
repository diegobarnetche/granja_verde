# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GRANJA VERDE is a farm management web application for tracking expenses (Gastos), sales, and orders (Ventas/Pedidos). Built with Express.js backend, React frontend, and PostgreSQL database.

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

### Build
```bash
cd frontend && npm run build
```

## Architecture

### Backend Structure (MVC Pattern)
```
backend/
├── server.js                 # Express entry point, database pool setup
└── modules/
    ├── gastos/               # Expense management module
    │   ├── gastos.routes.js
    │   ├── gastos.controller.js
    │   ├── gastos.service.js
    │   └── gastos.sql.js
    └── ventas/               # Sales/orders module
        ├── ventas.routes.js
        ├── ventas.controller.js
        ├── ventas.service.js
        ├── ventas.validators.js
        ├── ventas.sql.js
        └── sql/constraints.sql
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
├── App.jsx          # Router (react-router-dom)
├── pages/
│   ├── Gastos.jsx   # Expense form + list
│   └── Ventas.jsx   # 3-step wizard for sales/orders
└── components/
    └── Navbar.jsx
```

## Database

- **Schema**: `"GV"` (quoted identifiers required)
- **Key tables**: VENTAS, PEDIDOS, PEDIDOS_DETALLE, CLIENTE, PRODUCTO, GASTO
- **Important**: Product primary key is `ITEM` (BIGINT), NOT `ID_PRODUCTO`
- **UMD**: Unit multiplier for quantity calculations (CANTIDAD_UNIDADES = CANTIDAD × UMD)

## API Conventions

### Endpoints
- Gastos: `GET/POST/PUT/DELETE /api/gastos`
- Ventas: `/api/ventas`, `/api/ventas/:venta_id`, `/api/ventas/catalogos`

### Validation Enums
- VENTA_TYPE: `VENTA | PEDIDO`
- PED_SUBTYPE: `GRANJA | TELEFONO | PUNTO DE VENTA`
- PED_STATUS: `PENDIENTE | PREPARANDO | ENVIADO | PREPARADO | ENTREGADO | CANCELADO`
- METODO_DE_PAGO: `DEBITO | TRANSFERENCIA | CREDITO | EFECTIVO`
- PAGO_STATUS: `PENDIENTE | PAGO PARCIAL | PAGADO | CANCELADO`

### Business Rules
- CANTIDAD must be a multiple of 0.5
- MONTO_PAGO must be >= 0 and <= MONTO
- Ventas with VENTA_TYPE='PEDIDO' require ITEMS array and PED_SUBTYPE
- All operations use PostgreSQL transactions for atomic writes

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

Optional SSH tunnel configuration available (USE_SSH=true) for remote database access.

## Key Implementation Details

- SQL queries use parameterized queries ($1, $2, etc.) for injection protection
- Frontend constructs API URLs dynamically using `window.location.hostname`
- Debug endpoint available: `GET /api/debug/:tabla-schema`
