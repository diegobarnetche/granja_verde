/**
 * cobros.sql.js
 * Queries SQL para el módulo de cobros
 * Tablas: VENTAS, ING_TRANSACCIONES, ING_DETALLE
 */

module.exports = {
  // Clientes con saldo pendiente > 0
  getClientesConDeuda: `
    SELECT
      v."ID_CLIENTE" as id_cliente,
      c."NOMBRE" || COALESCE(' ' || c."APELLIDO", '') as cliente_nombre,
      SUM(v."SALDO_PENDIENTE") as saldo_pendiente,
      COUNT(v."ID_VENTA") as ventas_pendientes
    FROM "GV"."VENTAS" v
    INNER JOIN "GV"."CLIENTE" c ON v."ID_CLIENTE" = c."ID_CLIENT"
    WHERE v."SALDO_PENDIENTE" > 0
    GROUP BY v."ID_CLIENTE", c."NOMBRE", c."APELLIDO"
    ORDER BY saldo_pendiente DESC
  `,

  // Ventas pendientes de un cliente (ordenadas por fecha ASC para FIFO)
  getVentasPendientesByCliente: `
    SELECT
      v."ID_VENTA",
      v."FECHA_VENTA",
      v."TOTAL",
      v."SALDO_PENDIENTE",
      v."ESTADO"
    FROM "GV"."VENTAS" v
    WHERE v."ID_CLIENTE" = $1
      AND v."SALDO_PENDIENTE" > 0
    ORDER BY v."FECHA_VENTA" ASC
  `,

  // Obtener deuda total de un cliente
  getDeudaCliente: `
    SELECT
      COALESCE(SUM("SALDO_PENDIENTE"), 0) as deuda_total
    FROM "GV"."VENTAS"
    WHERE "ID_CLIENTE" = $1
      AND "SALDO_PENDIENTE" > 0
  `,

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

  // Insertar detalle de aplicación de pago
  insertIngDetalle: `
    INSERT INTO "GV"."ING_DETALLE" (
      "ID_ING",
      "ID_VENTA",
      "MONTO_APLICADO",
      "FECHA_APLICACION"
    ) VALUES ($1, $2, $3, $4)
    RETURNING "ID_ING_DET"
  `,

  // Actualizar saldo pendiente de una venta
  updateSaldoVenta: `
    UPDATE "GV"."VENTAS"
    SET
      "SALDO_PENDIENTE" = $2,
      "ESTADO" = $3
    WHERE "ID_VENTA" = $1
    RETURNING "ID_VENTA", "SALDO_PENDIENTE", "ESTADO"
  `,

  // Historial de pagos de un cliente
  getHistorialPagosCliente: `
    SELECT
      t."ID_ING",
      t."FECHA_ING",
      t."MONTO",
      t."METODO_PAGO",
      t."REFERENCIA",
      t."NOTA",
      t."ESTADO"
    FROM "GV"."ING_TRANSACCIONES" t
    WHERE t."ID_CLIENTE" = $1
    ORDER BY t."FECHA_ING" DESC
    LIMIT $2 OFFSET $3
  `,

  // Detalle de aplicación de un pago
  getDetalleAplicacion: `
    SELECT
      d."ID_ING_DET",
      d."ID_VENTA",
      d."MONTO_APLICADO",
      d."FECHA_APLICACION",
      v."FECHA_VENTA",
      v."TOTAL"
    FROM "GV"."ING_DETALLE" d
    INNER JOIN "GV"."VENTAS" v ON d."ID_VENTA" = v."ID_VENTA"
    WHERE d."ID_ING" = $1
    ORDER BY d."FECHA_APLICACION"
  `,
};
