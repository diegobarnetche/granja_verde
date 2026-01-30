/**
 * ventas.sql.js
 * Queries SQL para el módulo de ventas (nuevo esquema)
 * Tablas: VENTAS, DETALLE_VENTAS, ING_TRANSACCIONES
 * Todas las queries usan schema "GV" con comillas dobles
 */

module.exports = {
  // ===== LOOKUPS / CATALOGOS =====

  getClientes: `
    SELECT
      "ID_CLIENT" as id,
      "NOMBRE" || COALESCE(' ' || "APELLIDO", '') as label
    FROM "GV"."CLIENTE"
    ORDER BY "NOMBRE", "APELLIDO"
  `,

  getProductos: `
    SELECT
      "ITEM" as item,
      "ITEM_DESCRIPCION" as label,
      "UMD" as umd
    FROM "GV"."PRODUCTO"
    ORDER BY "ITEM_DESCRIPCION"
  `,

  // Búsqueda de clientes por nombre (para lookup con filtro)
  searchClientes: `
    SELECT
      "ID_CLIENT" as id,
      "NOMBRE" || COALESCE(' ' || "APELLIDO", '') as label,
      "TELEFONO" as telefono,
      "DIRECCION" as direccion
    FROM "GV"."CLIENTE"
    WHERE LOWER("NOMBRE" || COALESCE(' ' || "APELLIDO", '')) LIKE LOWER($1)
    ORDER BY "NOMBRE", "APELLIDO"
    LIMIT 20
  `,

  // Búsqueda de productos por descripción (para lookup con filtro)
  searchProductos: `
    SELECT
      "ITEM" as item,
      "ITEM_DESCRIPCION" as label,
      "UMD" as umd
    FROM "GV"."PRODUCTO"
    WHERE LOWER("ITEM_DESCRIPCION") LIKE LOWER($1)
    ORDER BY "ITEM_DESCRIPCION"
    LIMIT 20
  `,

  // Verificar existencia de productos y traer UMD
  checkProductosExisten: `
    SELECT "ITEM", "UMD"
    FROM "GV"."PRODUCTO"
    WHERE "ITEM" = ANY($1::bigint[])
  `,

  // ===== VENTAS =====

  // Insertar venta
  insertVenta: `
    INSERT INTO "GV"."VENTAS" (
      "FECHA_VENTA",
      "ID_CLIENTE",
      "CANAL",
      "TOTAL",
      "ESTADO_PREP",
      "ESTADO",
      "SALDO_PENDIENTE"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING "ID_VENTA"
  `,

  // Obtener una venta por ID
  getVentaById: `
    SELECT
      v."ID_VENTA",
      v."FECHA_VENTA",
      v."ID_CLIENTE",
      v."CANAL",
      v."TOTAL",
      v."ESTADO_PREP",
      v."ESTADO",
      v."SALDO_PENDIENTE",
      c."NOMBRE" || COALESCE(' ' || c."APELLIDO", '') as "CLIENTE_NOMBRE"
    FROM "GV"."VENTAS" v
    INNER JOIN "GV"."CLIENTE" c ON v."ID_CLIENTE" = c."ID_CLIENT"
    WHERE v."ID_VENTA" = $1
  `,

  // Listado de ventas con filtros
  getVentas: `
    SELECT
      v."ID_VENTA",
      v."FECHA_VENTA",
      v."ID_CLIENTE",
      v."CANAL",
      v."TOTAL",
      v."ESTADO_PREP",
      v."ESTADO",
      v."SALDO_PENDIENTE",
      c."NOMBRE" || COALESCE(' ' || c."APELLIDO", '') as "CLIENTE_NOMBRE"
    FROM "GV"."VENTAS" v
    INNER JOIN "GV"."CLIENTE" c ON v."ID_CLIENTE" = c."ID_CLIENT"
    WHERE 1=1
      AND ($1::date IS NULL OR v."FECHA_VENTA"::date >= $1::date)
      AND ($2::date IS NULL OR v."FECHA_VENTA"::date <= $2::date)
      AND ($3::text IS NULL OR v."CANAL" = $3)
    ORDER BY v."FECHA_VENTA" DESC
    LIMIT $4 OFFSET $5
  `,

  // Actualizar venta
  updateVenta: `
    UPDATE "GV"."VENTAS"
    SET
      "CANAL" = $2,
      "TOTAL" = $3,
      "ESTADO_PREP" = $4,
      "ESTADO" = $5,
      "SALDO_PENDIENTE" = $6
    WHERE "ID_VENTA" = $1
    RETURNING *
  `,

  // ===== DETALLE_VENTAS =====

  // Insertar línea de detalle
  insertDetalleVenta: `
    INSERT INTO "GV"."DETALLE_VENTAS" (
      "ID_VENTA",
      "ITEM",
      "UMD",
      "CANTIDAD",
      "CANTIDAD_UNIDADES",
      "SUBTOTAL",
      "ESTADO_PREP"
    ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE')
    RETURNING "ID_DETALLE"
  `,

  // Obtener detalle de una venta con info de productos
  getDetalleByVentaId: `
    SELECT
      d."ID_DETALLE",
      d."ID_VENTA",
      d."ITEM",
      d."UMD",
      d."CANTIDAD",
      d."CANTIDAD_UNIDADES",
      d."SUBTOTAL",
      d."ESTADO_PREP",
      p."ITEM_DESCRIPCION"
    FROM "GV"."DETALLE_VENTAS" d
    INNER JOIN "GV"."PRODUCTO" p ON d."ITEM" = p."ITEM"
    WHERE d."ID_VENTA" = $1
    ORDER BY d."ID_DETALLE"
  `,

  // Eliminar detalle de venta (para reemplazar en edición)
  deleteDetalleByVentaId: `
    DELETE FROM "GV"."DETALLE_VENTAS"
    WHERE "ID_VENTA" = $1
  `,

  // ===== ING_TRANSACCIONES (PAGOS) =====

  // Insertar transacción de ingreso (pago)
  insertIngTransaccion: `
    INSERT INTO "GV"."ING_TRANSACCIONES" (
      "FECHA_ING",
      "ID_CLIENTE",
      "MONTO",
      "METODO_PAGO",
      "REFERENCIA",
      "NOTA",
      "ESTADO"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING "ID_ING"
  `,

  // Obtener transacciones de un cliente
  getTransaccionesByCliente: `
    SELECT
      "ID_ING",
      "FECHA_ING",
      "ID_CLIENTE",
      "MONTO",
      "METODO_PAGO",
      "REFERENCIA",
      "NOTA",
      "ESTADO"
    FROM "GV"."ING_TRANSACCIONES"
    WHERE "ID_CLIENTE" = $1
    ORDER BY "FECHA_ING" DESC
  `,

  // ===== ING_DETALLE (APLICACIÓN DE PAGOS) =====

  // Insertar detalle de aplicación de pago a venta
  insertIngDetalle: `
    INSERT INTO "GV"."ING_DETALLE" (
      "ID_ING",
      "ID_VENTA",
      "MONTO_APLICADO",
      "FECHA_APLICACION"
    ) VALUES ($1, $2, $3, $4)
    RETURNING "ID_ING_DET"
  `,

  // Actualizar saldo pendiente y estado de una venta
  updateSaldoVenta: `
    UPDATE "GV"."VENTAS"
    SET
      "SALDO_PENDIENTE" = $2,
      "ESTADO" = $3
    WHERE "ID_VENTA" = $1
    RETURNING "ID_VENTA", "SALDO_PENDIENTE", "ESTADO"
  `,
};
