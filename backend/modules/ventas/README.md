# Módulo de Ventas y Pedidos

Módulo desacoplado para gestionar ventas y pedidos en GRANJA VERDE.

## Estructura

```
backend/modules/ventas/
├── ventas.routes.js       # Definición de rutas
├── ventas.controller.js   # Controladores/handlers
├── ventas.service.js      # Lógica de negocio y transacciones
├── ventas.validators.js   # Validaciones de datos
├── ventas.sql.js          # Queries SQL
├── sql/
│   └── constraints.sql    # Foreign Keys sugeridas
└── README.md             # Este archivo
```

## Endpoints Disponibles

Base URL: `/api/ventas`

### 1. GET /api/ventas/catalogos

Obtiene los lookups de clientes y productos.

**Response:**
```json
{
  "clientes": [
    { "id": 1, "label": "Juan Pérez" },
    { "id": 2, "label": "María García" }
  ],
  "productos": [
    { "item": 100, "label": "Huevos Blancos", "umd": "MAPLE" },
    { "item": 101, "label": "Huevos Marrones", "umd": "MAPLE" }
  ]
}
```

**Ejemplo curl:**
```bash
curl -X GET http://localhost:3001/api/ventas/catalogos
```

---

### 2. POST /api/ventas

Crea una venta y opcionalmente un pedido con detalle (todo en una transacción).

**Request Body - Ejemplo VENTA (sin pedido):**
```json
{
  "CLIENTE_ID": 1,
  "VENTA_TYPE": "VENTA",
  "METODO_DE_PAGO": "EFECTIVO",
  "PAGO_STATUS": "PAGADO",
  "MONTO": 1500.00,
  "MONTO_PAGO": 1500.00
}
```

**Request Body - Ejemplo PEDIDO (con items):**
```json
{
  "CLIENTE_ID": 2,
  "VENTA_TYPE": "PEDIDO",
  "PED_SUBTYPE": "TELEFONO",
  "PED_STATUS": "PENDIENTE",
  "METODO_DE_PAGO": "TRANSFERENCIA",
  "PAGO_STATUS": "PENDIENTE",
  "MONTO": 3250.50,
  "MONTO_PAGO": 0,
  "ITEMS": [
    {
      "PRODUCTO_ID": 100,
      "CANTIDAD": 2.5,
      "UMD": "MAPLE",
      "CANTIDAD_UNIDADES": 30
    },
    {
      "PRODUCTO_ID": 101,
      "CANTIDAD": 1,
      "UMD": "MAPLE",
      "CANTIDAD_UNIDADES": 12
    }
  ]
}
```

**Response:**
```json
{
  "VENTA_ID": 42,
  "PED_ID": 15
}
```
*Nota: PED_ID será `null` si VENTA_TYPE='VENTA'*

**Ejemplo curl (VENTA):**
```bash
curl -X POST http://localhost:3001/api/ventas \
  -H "Content-Type: application/json" \
  -d '{
    "CLIENTE_ID": 1,
    "VENTA_TYPE": "VENTA",
    "METODO_DE_PAGO": "EFECTIVO",
    "PAGO_STATUS": "PAGADO",
    "MONTO": 1500.00,
    "MONTO_PAGO": 1500.00
  }'
```

**Ejemplo curl (PEDIDO):**
```bash
curl -X POST http://localhost:3001/api/ventas \
  -H "Content-Type: application/json" \
  -d '{
    "CLIENTE_ID": 2,
    "VENTA_TYPE": "PEDIDO",
    "PED_SUBTYPE": "GRANJA",
    "PED_STATUS": "PENDIENTE",
    "METODO_DE_PAGO": "DEBITO",
    "PAGO_STATUS": "PENDIENTE",
    "MONTO": 2400.50,
    "MONTO_PAGO": 0,
    "ITEMS": [
      {
        "PRODUCTO_ID": 100,
        "CANTIDAD": 3,
        "UMD": "MAPLE",
        "CANTIDAD_UNIDADES": 36
      }
    ]
  }'
```

---

### 3. GET /api/ventas/:venta_id

Obtiene una venta específica por ID, incluyendo pedido y detalle si aplica.

**Response (VENTA sin pedido):**
```json
{
  "VENTA_ID": 42,
  "CLIENTE_ID": 1,
  "VENTA_TYPE": "VENTA",
  "METODO_DE_PAGO": "EFECTIVO",
  "PAGO_STATUS": "PAGADO",
  "MONTO": "1500.00",
  "MONTO_PAGO": "1500.00",
  "PED_ID": null,
  "FECHA_CREACION": "2026-01-07T10:30:00.000Z"
}
```

**Response (VENTA con pedido):**
```json
{
  "VENTA_ID": 43,
  "CLIENTE_ID": 2,
  "VENTA_TYPE": "PEDIDO",
  "METODO_DE_PAGO": "TRANSFERENCIA",
  "PAGO_STATUS": "PENDIENTE",
  "MONTO": "3250.50",
  "MONTO_PAGO": "0.00",
  "PED_ID": 15,
  "FECHA_CREACION": "2026-01-07T11:00:00.000Z",
  "PEDIDO": {
    "PED_ID": 15,
    "CLIENTE_ID": 2,
    "PED_SUBTYPE": "TELEFONO",
    "PED_STATUS": "PENDIENTE",
    "FECHA_CREACION": "2026-01-07T11:00:00.000Z"
  },
  "DETALLE": [
    {
      "DET_ID": 20,
      "PED_ID": 15,
      "PRODUCTO_ID": 100,
      "CANTIDAD": "2.5",
      "UMD": "MAPLE",
      "CANTIDAD_UNIDADES": 30,
      "ITEM_DESCRICPCION": "Huevos Blancos",
      "PRODUCTO_UMD": "MAPLE"
    },
    {
      "DET_ID": 21,
      "PED_ID": 15,
      "PRODUCTO_ID": 101,
      "CANTIDAD": "1",
      "UMD": "MAPLE",
      "CANTIDAD_UNIDADES": 12,
      "ITEM_DESCRICPCION": "Huevos Marrones",
      "PRODUCTO_UMD": "MAPLE"
    }
  ]
}
```

**Ejemplo curl:**
```bash
curl -X GET http://localhost:3001/api/ventas/43
```

---

### 4. PUT /api/ventas/:venta_id

Actualiza una venta y su pedido asociado (si tiene).

**Request Body:**
```json
{
  "METODO_DE_PAGO": "CREDITO",
  "PAGO_STATUS": "PAGO PARCIAL",
  "MONTO": 3250.50,
  "MONTO_PAGO": 1000.00,
  "PED_STATUS": "PREPARANDO",
  "PED_SUBTYPE": "TELEFONO",
  "ITEMS": [
    {
      "PRODUCTO_ID": 100,
      "CANTIDAD": 3,
      "UMD": "MAPLE",
      "CANTIDAD_UNIDADES": 36
    }
  ]
}
```

**Response:**
```json
{
  "VENTA_ID": 43,
  "CLIENTE_ID": 2,
  "VENTA_TYPE": "PEDIDO",
  "METODO_DE_PAGO": "CREDITO",
  "PAGO_STATUS": "PAGO PARCIAL",
  "MONTO": "3250.50",
  "MONTO_PAGO": "1000.00",
  "PED_ID": 15,
  "FECHA_CREACION": "2026-01-07T11:00:00.000Z"
}
```

**Ejemplo curl:**
```bash
curl -X PUT http://localhost:3001/api/ventas/43 \
  -H "Content-Type: application/json" \
  -d '{
    "PAGO_STATUS": "PAGADO",
    "MONTO_PAGO": 3250.50,
    "PED_STATUS": "ENTREGADO"
  }'
```

---

### 5. GET /api/ventas

Obtiene un listado de ventas con filtros opcionales.

**Query Parameters:**
- `from` (opcional): Fecha desde (YYYY-MM-DD)
- `to` (opcional): Fecha hasta (YYYY-MM-DD)
- `tipo` (opcional): `VENTA` o `PEDIDO`
- `limit` (opcional): Límite de resultados (default: 50)
- `offset` (opcional): Offset para paginación (default: 0)

**Response:**
```json
[
  {
    "VENTA_ID": 43,
    "CLIENTE_ID": 2,
    "VENTA_TYPE": "PEDIDO",
    "METODO_DE_PAGO": "TRANSFERENCIA",
    "PAGO_STATUS": "PENDIENTE",
    "MONTO": "3250.50",
    "MONTO_PAGO": "0.00",
    "PED_ID": 15,
    "FECHA_CREACION": "2026-01-07T11:00:00.000Z",
    "CLIENTE_NOMBRE": "María García"
  },
  {
    "VENTA_ID": 42,
    "CLIENTE_ID": 1,
    "VENTA_TYPE": "VENTA",
    "METODO_DE_PAGO": "EFECTIVO",
    "PAGO_STATUS": "PAGADO",
    "MONTO": "1500.00",
    "MONTO_PAGO": "1500.00",
    "PED_ID": null,
    "FECHA_CREACION": "2026-01-07T10:30:00.000Z",
    "CLIENTE_NOMBRE": "Juan Pérez"
  }
]
```

**Ejemplo curl (con filtros):**
```bash
curl -X GET "http://localhost:3001/api/ventas?from=2026-01-01&to=2026-01-31&tipo=PEDIDO&limit=20&offset=0"
```

**Ejemplo curl (sin filtros):**
```bash
curl -X GET http://localhost:3001/api/ventas
```

---

## Reglas de Negocio

### Validaciones

1. **CLIENTE_ID y PRODUCTO_ID**: Deben ser enteros positivos válidos (BIGINT)
2. **MONTO y MONTO_PAGO**: Numéricos con 2 decimales. `MONTO_PAGO` debe ser >= 0 y <= `MONTO`
3. **CANTIDAD**: Debe ser múltiplo de 0.5 (ej: 0.5, 1, 1.5, 2, etc.)
4. **ITEMS**: Obligatorio y con al menos 1 elemento cuando `VENTA_TYPE='PEDIDO'`
5. **PED_SUBTYPE**: Obligatorio cuando `VENTA_TYPE='PEDIDO'`
6. **Productos**: Todos los `PRODUCTO_ID` en `ITEMS` deben existir en `"GV"."PRODUCTO"` antes de crear/actualizar

### Transacciones

- La creación de ventas con pedidos se hace en una sola transacción:
  1. Si `VENTA_TYPE='PEDIDO'`, primero se crea el pedido y su detalle
  2. Luego se crea la venta con el `PED_ID` generado
  3. Si falla cualquier paso, se hace ROLLBACK completo

- La actualización también usa transacciones:
  1. Se actualiza la venta
  2. Si hay pedido asociado, se actualiza
  3. Si hay nuevos items, se elimina el detalle anterior y se inserta el nuevo

### Valores permitidos

- **VENTA_TYPE**: `VENTA`, `PEDIDO`
- **PED_SUBTYPE**: `GRANJA`, `TELEFONO`, `PUNTO DE VENTA`
- **PED_STATUS**: `PENDIENTE`, `PREPARANDO`, `ENVIADO`, `PREPARADO`, `ENTREGADO`, `CANCELADO`
- **METODO_DE_PAGO**: `DEBITO`, `TRANSFERENCIA`, `CREDITO`, `EFECTIVO`
- **PAGO_STATUS**: `PENDIENTE`, `PAGO PARCIAL`, `PAGADO`, `CANCELADO`

---

## Tablas utilizadas

- `"GV"."VENTAS"`: Todas las ventas (con o sin pedido)
- `"GV"."PEDIDOS"`: Pedidos únicamente (1-1 con ventas cuando aplica)
- `"GV"."PEDIDOS_DETALLE"`: Líneas de pedidos con productos
- `"GV"."CLIENTE"`: Catálogo de clientes (PK: `ID_CLIENT` BIGINT)
- `"GV"."PRODUCTO"`: Catálogo de productos (PK: `ITEM` BIGINT)

**IMPORTANTE**: La PK de productos es `ITEM` (BIGINT), NO `ID_PRODUCTO`.

---

## Foreign Keys

Para asegurar integridad referencial, ejecutar los scripts en [sql/constraints.sql](./sql/constraints.sql).

**NO ejecutar automáticamente** - revisar y aplicar manualmente cuando corresponda.

---

## Errores comunes

### 400 Bad Request
- Datos inválidos en el payload
- CANTIDAD no es múltiplo de 0.5
- Productos no existen en la base de datos
- MONTO_PAGO mayor que MONTO

### 404 Not Found
- La venta con el ID especificado no existe

### 500 Internal Server Error
- Error de conexión a la base de datos
- Error en la transacción SQL

---

## Notas de implementación

- El módulo está desacoplado del resto del backend
- Pool de conexiones compartido desde `server.js`
- Todas las queries usan schema `"GV"` con comillas dobles
- Los IDs de productos se manejan por `ITEM` (BIGINT), no por `ID_PRODUCTO`
