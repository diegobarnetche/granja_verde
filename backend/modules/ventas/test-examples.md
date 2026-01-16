# Ejemplos de prueba - Módulo de Ventas

## Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ventas/catalogos` | Obtiene clientes, productos y enumeraciones |
| GET | `/api/ventas/search/clientes?q=texto` | Búsqueda de clientes |
| GET | `/api/ventas/search/productos?q=texto` | Búsqueda de productos |
| POST | `/api/ventas/mock` | Simula creación de venta (dry-run) |
| GET | `/api/ventas` | Lista ventas con filtros |
| GET | `/api/ventas/:id` | Obtiene una venta por ID |
| POST | `/api/ventas` | Crea una venta |
| PUT | `/api/ventas/:id` | Actualiza una venta |

---

## Ejemplo 1: PEDIDO con 3 items, pago parcial

```bash
curl -X POST http://localhost:3001/api/ventas/mock \
  -H "Content-Type: application/json" \
  -d '{
    "ID_CLIENTE": 1,
    "CANAL": "PEDIDO",
    "ESTADO_PREP": "PENDIENTE",
    "ITEMS": [
      { "ITEM": 101, "CANTIDAD": 2, "SUBTOTAL": 150.00 },
      { "ITEM": 102, "CANTIDAD": 3, "SUBTOTAL": 225.50 },
      { "ITEM": 103, "CANTIDAD": 1, "SUBTOTAL": 80.00 }
    ],
    "ABONADO": 200.00,
    "METODO_PAGO": "TRANSFERENCIA",
    "REFERENCIA": "TRF-123456",
    "NOTA": "Pago parcial, resto a entregar"
  }'
```

Resultado esperado:
- Total: 455.50 (150 + 225.50 + 80)
- Abonado: 200.00
- Saldo Pendiente: 255.50
- Estado: "PAGO PARCIAL"
- Estado Prep: "PENDIENTE"
- Se crea ING_TRANSACCIONES porque ABONADO > 0

---

## Ejemplo 2: POS con 1 item, pago completo

```bash
curl -X POST http://localhost:3001/api/ventas/mock \
  -H "Content-Type: application/json" \
  -d '{
    "ID_CLIENTE": 2,
    "CANAL": "POS",
    "ITEMS": [
      { "ITEM": 101, "CANTIDAD": 5, "SUBTOTAL": 375.00 }
    ],
    "ABONADO": 375.00,
    "METODO_PAGO": "EFECTIVO"
  }'
```

Resultado esperado:
- Total: 375.00
- Abonado: 375.00
- Saldo Pendiente: 0.00
- Estado: "PAGO"
- Estado Prep: null (porque CANAL=POS)
- Se crea ING_TRANSACCIONES porque ABONADO > 0

---

## Ejemplo 3: Venta sin pago

```bash
curl -X POST http://localhost:3001/api/ventas/mock \
  -H "Content-Type: application/json" \
  -d '{
    "ID_CLIENTE": 3,
    "CANAL": "PEDIDO",
    "ESTADO_PREP": "PREPARADO",
    "ITEMS": [
      { "ITEM": 101, "CANTIDAD": 10, "SUBTOTAL": 750.00 }
    ]
  }'
```

Resultado esperado:
- Total: 750.00
- Abonado: 0.00 (default)
- Saldo Pendiente: 750.00
- Estado: "PAGO PENDIENTE"
- Estado Prep: "PREPARADO"
- NO se crea ING_TRANSACCIONES porque ABONADO = 0

---

## Ejecutar script de demo

```bash
cd backend
node modules/ventas/demo-mock.js
```

Este script ejecuta los escenarios 1 y 2 automáticamente y muestra el resultado formateado.

---

## Nuevo esquema de tablas

### VENTAS
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ID_VENTA | bigint PK | ID autogenerado |
| FECHA_VENTA | timestamptz | Fecha/hora de creación |
| ID_CLIENTE | bigint | FK a CLIENTE |
| CANAL | text | 'POS' o 'PEDIDO' |
| TOTAL | numeric | Sum de subtotales |
| ESTADO_PREP | text | 'PENDIENTE'/'PREPARADO'/'ENTREGADO' (solo PEDIDO) |
| ESTADO | text | 'PAGO PENDIENTE'/'PAGO PARCIAL'/'PAGO' |
| SALDO_PENDIENTE | numeric | TOTAL - ABONADO |

### DETALLE_VENTAS
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ID_DETALLE | bigint PK | ID autogenerado |
| ID_VENTA | bigint | FK a VENTAS |
| ITEM | bigint | FK a PRODUCTO |
| UMD | integer | Unidades por empaque |
| CANTIDAD | numeric | Cantidad ingresada (entero) |
| CANTIDAD_UNIDADES | numeric | CANTIDAD * UMD |
| SUBTOTAL | numeric | Monto de la línea |

### ING_TRANSACCIONES
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ID_ING | bigint PK | ID autogenerado |
| FECHA_ING | timestamptz | Fecha/hora del pago |
| ID_CLIENTE | bigint | FK a CLIENTE |
| MONTO | numeric | Monto abonado |
| METODO_PAGO | text | 'DEBITO'/'CREDITO'/'TRANSFERENCIA'/'EFECTIVO'/'OTROS' |
| REFERENCIA | text | Opcional |
| NOTA | text | Opcional |
| ESTADO | text | Default 'ACTIVO' |
