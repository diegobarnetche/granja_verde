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
| Gastos V2 | OK | OK | Funcional (refactorizado) |
| Pago Obligaciones | OK | OK | Funcional |
| Cambios | OK | OK | Funcional |
| Pedidos | - | Placeholder | Pendiente desarrollo |

### Pending Tasks
- [ ] PWA: Implementar Nivel 0 (instalable, sin offline)
- [ ] PWA: Futuro - Nivel 1 (cache de catálogos para lectura offline)
- [ ] Pedidos: Desarrollar módulo completo

### Recent Changes (2026-01-28)
- **Refactor completo Gastos V2**: Nueva arquitectura con tablas GASTO_V2, EG_TRANSACCIONES, EG_DETALLE
- **Nuevo módulo Pago Obligaciones**: Pagar gastos pendientes o parciales
- **Nuevo módulo Cambios**: Cambio de moneda y transferencias entre cuentas
- **Mapeo ID_CUENTA en ING_TRANSACCIONES**: Ventas y Cobros ahora resuelven automáticamente la cuenta
- Escenarios de pago obligatorios (PAGO TOTAL, PAGO PARCIAL, SIN PAGO) con modal
- Múltiples líneas de pago por transacción
- Mapeo automático de cuentas (METODO_PAGO + MONEDA -> ID_CUENTA) en todos los módulos
- Categorías y subcategorías dinámicas desde BD

### Previous Changes (2026-01-16)
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
    ├── shared/               # Servicios compartidos
    │   └── pagos.service.js  # Lógica de pagos (ING_TRANSACCIONES) con ID_CUENTA
    ├── gastos/               # Expense management (V2)
    │   ├── gastos.routes.js
    │   ├── gastos.controller.js
    │   ├── gastos.service.js
    │   ├── gastos.validators.js
    │   └── gastos.sql.js
    ├── ventas/               # Sales module
    │   ├── ventas.routes.js
    │   ├── ventas.controller.js
    │   ├── ventas.service.js
    │   ├── ventas.validators.js
    │   └── ventas.sql.js
    ├── cobros/               # Collections/payments module
    │   ├── cobros.routes.js
    │   ├── cobros.controller.js
    │   ├── cobros.service.js
    │   ├── cobros.validators.js
    │   └── cobros.sql.js
    └── cambios/              # Currency exchange / transfers
        ├── cambios.routes.js
        ├── cambios.controller.js
        ├── cambios.service.js
        └── cambios.sql.js
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
├── App.jsx                  # Router (react-router-dom)
├── pages/
│   ├── Ventas.jsx           # 4-step wizard for sales
│   ├── Cobros.jsx           # 4-step wizard for collections
│   ├── Gastos.jsx           # Formulario con modal de escenarios de pago
│   ├── PagoObligaciones.jsx # Pagar gastos pendientes/parciales
│   ├── Cambios.jsx          # Cambio de moneda y transferencias
│   └── Pedidos.jsx          # Placeholder "Módulo no disponible"
└── components/
    └── Navbar.jsx           # Navigation (Ventas, Cobros, Gastos, Pago Obligaciones, Pedidos, Cambios)
```

## Database

- **Schema**: `"GV"` (quoted identifiers required)
- **Important**: Product primary key is `ITEM` (BIGINT), NOT `ID_PRODUCTO`
- **UMD**: Unit multiplier for quantity calculations (CANTIDAD_UNIDADES = CANTIDAD × UMD)

### Key Tables

#### Ventas (Ingresos)
- `VENTAS` - Cabecera de ventas
- `ING_TRANSACCIONES` - Transacciones de ingreso (cobros)
- `ING_DETALLE` - Detalle de aplicación de cobros a ventas
- `CLIENTE`, `PRODUCTO` - Catálogos

#### Gastos V2 (Egresos)
- `GASTO_V2` - Cabecera de gastos (obligación)
- `EG_TRANSACCIONES` - Transacciones de egreso (pagos)
- `EG_DETALLE` - Detalle de aplicación de pagos a gastos
- `CATEGORIA_GASTO`, `SUBCATEGORIA_GASTO` - Catálogos de categorías
- `CUENTA_DINERO` - Cuentas de dinero (CAJA UYU, CAJA USD, BROU UYU, BROU USD)
- `V_GASTO_ESTADO` - Vista calculada con estado de cada gasto

#### Cambios de Moneda
- `CAMBIO_MONEDA` - Registro de cambios y transferencias entre cuentas
- `V_SALDO_CUENTA_TIEMPO_REAL` - Vista con saldo actual de cada cuenta (incluye cambios)

### VENTAS.ESTADO Check Constraint
```sql
CHECK ("ESTADO" IN ('PAGO PENDIENTE','PAGO PARCIAL','PAGO','CANCELADO'))
```

### V_GASTO_ESTADO (Vista)
Calcula el estado de cada gasto basado en pagos realizados:
- `PENDIENTE` - Sin pagos (MONTO_PAGADO = 0)
- `PAGO_PARCIAL` - Pagos parciales (0 < MONTO_PAGADO < MONTO_TOTAL) **Nota: con guión bajo**
- `PAGADO` - Totalmente pagado (MONTO_PAGADO >= MONTO_TOTAL)
- `CANCELADO` - Gasto cancelado

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

### Gastos V2
- `GET /api/gastos` - Listar todos los gastos
- `GET /api/gastos/:id` - Obtener gasto por ID
- `POST /api/gastos` - Crear gastos en batch (múltiples gastos con líneas de pago)
- `GET /api/gastos/categorias` - Listar categorías activas
- `GET /api/gastos/subcategorias?categoriaId=X` - Subcategorías por categoría

### Pago de Obligaciones
- `GET /api/gastos/obligaciones/pendientes` - Gastos pendientes/parciales
- `GET /api/gastos/obligaciones/:id` - Estado de un gasto específico
- `GET /api/gastos/obligaciones/:id/historial` - Historial de pagos del gasto
- `POST /api/gastos/obligaciones/pagar` - Registrar pago de obligación

### Cambios de Moneda
- `GET /api/cambios/cuentas` - Lista cuentas con saldo actual
- `GET /api/cambios/cuentas/:id/saldo` - Saldo de una cuenta específica
- `GET /api/cambios` - Historial de cambios
- `POST /api/cambios` - Registrar cambio/transferencia

## Business Rules

### Cobros - Payment Allocation
- Uses FIFO (First In, First Out) by FECHA_VENTA
- Payments distributed across oldest sales first
- Multiple payment lines allowed per transaction (e.g., $2000 cash + $1000 debit)

### Ventas/Cobros - Mapeo de Cuentas (ING_TRANSACCIONES)
El servicio compartido `pagos.service.js` resuelve automáticamente ID_CUENTA:
```javascript
// EFECTIVO -> CAJA {MONEDA}
// TRANSFERENCIA/DEBITO/CREDITO/OTROS -> BROU {MONEDA}

// Ejemplos (moneda default: UYU):
EFECTIVO -> "CAJA UYU"
TRANSFERENCIA -> "BROU UYU"
DEBITO -> "BROU UYU"
```

### Estado Calculation (Ventas)
```javascript
if (saldoPendiente <= 0) return 'PAGO';
if (saldoPendiente < total) return 'PAGO PARCIAL';
return 'PAGO PENDIENTE';
```

### Gastos V2 - Escenarios de Pago
Al crear un gasto, se debe seleccionar uno de 3 escenarios:

1. **PAGO TOTAL**: sum(paymentLines.monto) == MONTO_TOTAL
   - Gasto queda en estado PAGADO inmediatamente

2. **PAGO PARCIAL**: 0 < sum(paymentLines.monto) < MONTO_TOTAL
   - Requiere FECHA_VENCIMIENTO obligatoria
   - Gasto queda en estado PAGO PARCIAL

3. **SIN PAGO**: sum(paymentLines.monto) == 0
   - Requiere FECHA_VENCIMIENTO obligatoria
   - Gasto queda en estado PENDIENTE

### Gastos V2 - Mapeo de Cuentas
El backend resuelve automáticamente la cuenta según método de pago y moneda:
```javascript
// EFECTIVO -> CAJA {MONEDA}
// TRANSFERENCIA/DEBITO/OTRO -> BROU {MONEDA}

// Ejemplos:
EFECTIVO + UYU -> "CAJA UYU"
EFECTIVO + USD -> "CAJA USD"
TRANSFERENCIA + UYU -> "BROU UYU"
DEBITO + USD -> "BROU USD"
```

### Gastos V2 - Transacciones Atómicas
Cada batch de gastos se procesa en una transacción:
1. INSERT en GASTO_V2 (crea la obligación)
2. Para cada línea de pago:
   - INSERT en EG_TRANSACCIONES (registra el egreso)
   - INSERT en EG_DETALLE (vincula egreso con gasto)
3. COMMIT o ROLLBACK completo

### Pago de Obligaciones
- Lista gastos con ESTADO_CALCULADO IN ('PENDIENTE', 'PAGO_PARCIAL')
- Valida que suma de pagos <= saldo_pendiente
- Permite múltiples líneas de pago por transacción
- Actualiza estado automáticamente vía vista V_GASTO_ESTADO

### Cambios de Moneda / Transferencias
- Usuario ingresa monto en moneda ORIGEN o DESTINO (el otro se calcula)
- Factor de conversión: 1 USD = X UYU
- Valida saldo suficiente en cuenta origen antes de confirmar
- Transferencias misma moneda: factor fijo en 1
- Afecta saldos en V_SALDO_CUENTA_TIEMPO_REAL

```javascript
// Cálculo de montos
if (monedaInput === 'ORIGEN') {
  montoOrigen = monto_input
  if (origen=UYU, destino=USD): montoDestino = monto / factor
  if (origen=USD, destino=UYU): montoDestino = monto * factor
}
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
