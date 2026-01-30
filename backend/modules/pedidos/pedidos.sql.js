/**
 * pedidos.sql.js
 * Queries SQL para el módulo de pedidos V2 - Consolidado por Cliente
 * Tablas: VENTAS, DETALLE_VENTAS, CLIENTE, PRODUCTO
 */

module.exports = {
  // ===== CLIENTES CONSOLIDADOS =====

  // Lista de clientes con pedidos pendientes/preparados (consolidado)
  getClientesConPedidos: `
    SELECT
      c."ID_CLIENT" as "ID_CLIENTE",
      c."NOMBRE" || COALESCE(' ' || c."APELLIDO", '') as "CLIENTE_NOMBRE",
      COUNT(DISTINCT v."ID_VENTA") as "CANTIDAD_PEDIDOS",
      COUNT(d."ID_DETALLE") as "TOTAL_LINEAS",
      COUNT(d."ID_DETALLE") FILTER (WHERE d."ESTADO_PREP" = 'PREPARADO') as "LINEAS_PREPARADAS",
      SUM(v."TOTAL") as "TOTAL_MONTO",
      MIN(v."FECHA_VENTA") as "FECHA_PRIMER_PEDIDO"
    FROM "GV"."VENTAS" v
    INNER JOIN "GV"."CLIENTE" c ON v."ID_CLIENTE" = c."ID_CLIENT"
    INNER JOIN "GV"."DETALLE_VENTAS" d ON v."ID_VENTA" = d."ID_VENTA"
    WHERE v."CANAL" = 'PEDIDO'
      AND v."ESTADO_PREP" IN ('PENDIENTE', 'PREPARADO')
      AND ($1::text IS NULL OR LOWER(c."NOMBRE" || COALESCE(' ' || c."APELLIDO", '')) LIKE LOWER($1))
    GROUP BY c."ID_CLIENT", c."NOMBRE", c."APELLIDO"
    ORDER BY "FECHA_PRIMER_PEDIDO" ASC
  `,

  // ===== LINEAS POR CLIENTE =====

  // Todas las líneas de pedidos de un cliente (consolidadas)
  getLineasPorCliente: `
    SELECT
      d."ID_DETALLE",
      d."ID_VENTA",
      d."ITEM",
      p."ITEM_DESCRIPCION",
      d."UMD",
      d."CANTIDAD",
      d."CANTIDAD_UNIDADES",
      d."SUBTOTAL",
      d."ESTADO_PREP" as "ESTADO_LINEA",
      v."FECHA_VENTA",
      v."ESTADO_PREP" as "ESTADO_PEDIDO"
    FROM "GV"."DETALLE_VENTAS" d
    INNER JOIN "GV"."VENTAS" v ON d."ID_VENTA" = v."ID_VENTA"
    INNER JOIN "GV"."PRODUCTO" p ON d."ITEM" = p."ITEM"
    WHERE v."ID_CLIENTE" = $1
      AND v."CANAL" = 'PEDIDO'
      AND v."ESTADO_PREP" IN ('PENDIENTE', 'PREPARADO')
    ORDER BY v."FECHA_VENTA" ASC, d."ID_DETALLE" ASC
  `,

  // Resumen de pedidos de un cliente
  getResumenPedidosCliente: `
    SELECT
      v."ID_VENTA",
      v."FECHA_VENTA",
      v."TOTAL",
      v."ESTADO_PREP",
      v."ESTADO",
      COUNT(d."ID_DETALLE") as "TOTAL_LINEAS",
      COUNT(d."ID_DETALLE") FILTER (WHERE d."ESTADO_PREP" = 'PREPARADO') as "LINEAS_PREPARADAS"
    FROM "GV"."VENTAS" v
    INNER JOIN "GV"."DETALLE_VENTAS" d ON v."ID_VENTA" = d."ID_VENTA"
    WHERE v."ID_CLIENTE" = $1
      AND v."CANAL" = 'PEDIDO'
      AND v."ESTADO_PREP" IN ('PENDIENTE', 'PREPARADO')
    GROUP BY v."ID_VENTA", v."FECHA_VENTA", v."TOTAL", v."ESTADO_PREP", v."ESTADO"
    ORDER BY v."FECHA_VENTA" ASC
  `,

  // ===== CAMBIO DE ESTADO DE LINEAS =====

  // Actualizar estado de líneas específicas
  updateEstadoLineas: `
    UPDATE "GV"."DETALLE_VENTAS"
    SET "ESTADO_PREP" = $2
    WHERE "ID_DETALLE" = ANY($1::bigint[])
    RETURNING "ID_DETALLE", "ID_VENTA", "ESTADO_PREP"
  `,

  // Obtener los ID_VENTA afectados por las líneas
  getVentasDeLineas: `
    SELECT DISTINCT "ID_VENTA"
    FROM "GV"."DETALLE_VENTAS"
    WHERE "ID_DETALLE" = ANY($1::bigint[])
  `,

  // Verificar si todas las líneas de un pedido están preparadas
  checkPedidoCompleto: `
    SELECT
      v."ID_VENTA",
      COUNT(*) as "TOTAL_LINEAS",
      COUNT(*) FILTER (WHERE d."ESTADO_PREP" = 'PREPARADO') as "LINEAS_PREPARADAS"
    FROM "GV"."VENTAS" v
    INNER JOIN "GV"."DETALLE_VENTAS" d ON v."ID_VENTA" = d."ID_VENTA"
    WHERE v."ID_VENTA" = $1
    GROUP BY v."ID_VENTA"
  `,

  // Actualizar estado del pedido (venta)
  updateEstadoPedido: `
    UPDATE "GV"."VENTAS"
    SET "ESTADO_PREP" = $2
    WHERE "ID_VENTA" = $1 AND "CANAL" = 'PEDIDO'
    RETURNING "ID_VENTA", "ESTADO_PREP"
  `,

  // ===== ENTREGA DE CLIENTE =====

  // Marcar todas las líneas de un cliente como PREPARADAS
  prepararTodasLineasCliente: `
    UPDATE "GV"."DETALLE_VENTAS" d
    SET "ESTADO_PREP" = 'PREPARADO'
    FROM "GV"."VENTAS" v
    WHERE d."ID_VENTA" = v."ID_VENTA"
      AND v."ID_CLIENTE" = $1
      AND v."CANAL" = 'PEDIDO'
      AND v."ESTADO_PREP" IN ('PENDIENTE', 'PREPARADO')
      AND d."ESTADO_PREP" = 'PENDIENTE'
    RETURNING d."ID_DETALLE"
  `,

  // Marcar todos los pedidos de un cliente como PREPARADOS
  prepararPedidosCliente: `
    UPDATE "GV"."VENTAS"
    SET "ESTADO_PREP" = 'PREPARADO'
    WHERE "ID_CLIENTE" = $1
      AND "CANAL" = 'PEDIDO'
      AND "ESTADO_PREP" = 'PENDIENTE'
    RETURNING "ID_VENTA"
  `,

  // Marcar todos los pedidos de un cliente como ENTREGADOS
  entregarPedidosCliente: `
    UPDATE "GV"."VENTAS"
    SET "ESTADO_PREP" = 'ENTREGADO'
    WHERE "ID_CLIENTE" = $1
      AND "CANAL" = 'PEDIDO'
      AND "ESTADO_PREP" IN ('PENDIENTE', 'PREPARADO')
    RETURNING "ID_VENTA"
  `,

  // Obtener IDs de pedidos de un cliente (para validaciones)
  getPedidosIdsByCliente: `
    SELECT "ID_VENTA"
    FROM "GV"."VENTAS"
    WHERE "ID_CLIENTE" = $1
      AND "CANAL" = 'PEDIDO'
      AND "ESTADO_PREP" IN ('PENDIENTE', 'PREPARADO')
  `,

  // ===== ESTADISTICAS =====

  // Estadísticas generales de pedidos
  getStats: `
    SELECT
      COUNT(DISTINCT v."ID_VENTA") FILTER (WHERE v."ESTADO_PREP" = 'PENDIENTE') as "pedidos_pendientes",
      COUNT(DISTINCT v."ID_VENTA") FILTER (WHERE v."ESTADO_PREP" = 'PREPARADO') as "pedidos_preparados",
      COUNT(DISTINCT v."ID_VENTA") FILTER (WHERE v."ESTADO_PREP" = 'ENTREGADO' AND v."FECHA_VENTA"::date = CURRENT_DATE) as "entregados_hoy",
      COUNT(DISTINCT v."ID_CLIENTE") FILTER (WHERE v."ESTADO_PREP" IN ('PENDIENTE', 'PREPARADO')) as "clientes_con_pedidos"
    FROM "GV"."VENTAS" v
    WHERE v."CANAL" = 'PEDIDO'
  `,

  // ===== QUERIES LEGACY (mantener compatibilidad) =====

  // Obtener pedido por ID
  getPedidoById: `
    SELECT
      v."ID_VENTA",
      v."FECHA_VENTA",
      v."ID_CLIENTE",
      c."NOMBRE" || COALESCE(' ' || c."APELLIDO", '') as "CLIENTE_NOMBRE",
      v."CANAL",
      v."ESTADO_PREP",
      v."ESTADO",
      v."TOTAL",
      v."SALDO_PENDIENTE"
    FROM "GV"."VENTAS" v
    INNER JOIN "GV"."CLIENTE" c ON v."ID_CLIENTE" = c."ID_CLIENT"
    WHERE v."ID_VENTA" = $1 AND v."CANAL" = 'PEDIDO'
  `,

  // Detalle del pedido (items) con estado de línea
  getDetallePedido: `
    SELECT
      d."ID_DETALLE",
      d."ITEM",
      p."ITEM_DESCRIPCION",
      d."UMD",
      d."CANTIDAD",
      d."CANTIDAD_UNIDADES",
      d."SUBTOTAL",
      d."ESTADO_PREP" as "ESTADO_LINEA"
    FROM "GV"."DETALLE_VENTAS" d
    INNER JOIN "GV"."PRODUCTO" p ON d."ITEM" = p."ITEM"
    WHERE d."ID_VENTA" = $1
    ORDER BY d."ID_DETALLE"
  `,
};
