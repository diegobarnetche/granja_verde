/**
 * Queries SQL para el módulo de Gastos V2
 * Tablas: GASTO_V2, EG_TRANSACCIONES, EG_DETALLE
 */

const queries = {
  // ============================================
  // CATÁLOGOS
  // ============================================

  /**
   * Obtener todas las categorías de gasto activas
   */
  getCategorias: `
    SELECT "ID_CATEGORIA", "NOMBRE"
    FROM "GV"."CATEGORIA_GASTO"
    WHERE "ACTIVO" = true
    ORDER BY "NOMBRE"
  `,

  /**
   * Obtener subcategorías filtradas por categoría
   */
  getSubcategorias: `
    SELECT "ID_SUBCATEGORIA", "ID_CATEGORIA", "NOMBRE"
    FROM "GV"."SUBCATEGORIA_GASTO"
    WHERE "ID_CATEGORIA" = $1
    ORDER BY "NOMBRE"
  `,

  /**
   * Obtener cuenta de dinero por nombre
   */
  getCuentaByNombre: `
    SELECT "ID_CUENTA", "NOMBRE", "MONEDA"
    FROM "GV"."CUENTA_DINERO"
    WHERE "NOMBRE" = $1 AND "ACTIVA" = true
  `,

  // ============================================
  // LECTURAS GASTO_V2
  // ============================================

  /**
   * Obtener todos los gastos V2 con info de categoría
   */
  getAll: `
    SELECT
      g."ID_GASTO",
      g."FECHA_GASTO",
      g."MONTO_TOTAL",
      g."MONEDA",
      g."ID_CATEGORIA",
      c."NOMBRE" AS "CATEGORIA_NOMBRE",
      g."ID_SUBCATEGORIA_INSUMO",
      sc."NOMBRE" AS "SUBCATEGORIA_NOMBRE",
      g."FECHA_VENCIMIENTO",
      g."NUM_COMPROBANTE",
      g."DETALLE",
      g."PROVEEDOR",
      g."CENTRO_COSTO",
      g."IMPUESTOS",
      g."DESCUENTO",
      g."CANCELADO",
      g."CREADO_EN",
      COALESCE(SUM(ed."MONTO_APLICADO"), 0) AS "MONTO_PAGADO"
    FROM "GV"."GASTO_V2" g
    LEFT JOIN "GV"."CATEGORIA_GASTO" c ON g."ID_CATEGORIA" = c."ID_CATEGORIA"
    LEFT JOIN "GV"."SUBCATEGORIA_GASTO" sc ON g."ID_SUBCATEGORIA_INSUMO" = sc."ID_SUBCATEGORIA"
    LEFT JOIN "GV"."EG_DETALLE" ed ON g."ID_GASTO" = ed."ID_GASTO"
    WHERE g."CANCELADO" = false
    GROUP BY g."ID_GASTO", c."NOMBRE", sc."NOMBRE"
    ORDER BY g."FECHA_GASTO" DESC, g."ID_GASTO" DESC
  `,

  /**
   * Obtener un gasto por ID con sus transacciones
   */
  getById: `
    SELECT
      g."ID_GASTO",
      g."FECHA_GASTO",
      g."MONTO_TOTAL",
      g."MONEDA",
      g."ID_CATEGORIA",
      c."NOMBRE" AS "CATEGORIA_NOMBRE",
      g."ID_SUBCATEGORIA_INSUMO",
      sc."NOMBRE" AS "SUBCATEGORIA_NOMBRE",
      g."FECHA_VENCIMIENTO",
      g."NUM_COMPROBANTE",
      g."DETALLE",
      g."PROVEEDOR",
      g."CENTRO_COSTO",
      g."IMPUESTOS",
      g."DESCUENTO",
      g."CANCELADO",
      g."CREADO_EN"
    FROM "GV"."GASTO_V2" g
    LEFT JOIN "GV"."CATEGORIA_GASTO" c ON g."ID_CATEGORIA" = c."ID_CATEGORIA"
    LEFT JOIN "GV"."SUBCATEGORIA_GASTO" sc ON g."ID_SUBCATEGORIA_INSUMO" = sc."ID_SUBCATEGORIA"
    WHERE g."ID_GASTO" = $1
  `,

  /**
   * Obtener transacciones de egreso para un gasto
   */
  getTransaccionesByGasto: `
    SELECT
      et."ID_EG",
      et."FECHA_EG",
      et."MONTO",
      et."MONEDA",
      et."METODO_PAGO",
      et."ESTADO",
      ed."MONTO_APLICADO",
      ed."FECHA_APLICACION"
    FROM "GV"."EG_DETALLE" ed
    JOIN "GV"."EG_TRANSACCIONES" et ON ed."ID_EG" = et."ID_EG"
    WHERE ed."ID_GASTO" = $1
    ORDER BY et."FECHA_EG"
  `,

  // ============================================
  // INSERCIONES
  // ============================================

  /**
   * Insertar gasto V2 (obligación)
   */
  insertGasto: `
    INSERT INTO "GV"."GASTO_V2" (
      "FECHA_GASTO",
      "MONTO_TOTAL",
      "MONEDA",
      "ID_CATEGORIA",
      "ID_SUBCATEGORIA_INSUMO",
      "FECHA_VENCIMIENTO",
      "NUM_COMPROBANTE",
      "DETALLE"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING "ID_GASTO", "CREADO_EN"
  `,

  /**
   * Insertar transacción de egreso
   * FECHA_EG usa DEFAULT now() en la tabla
   */
  insertEgTransaccion: `
    INSERT INTO "GV"."EG_TRANSACCIONES" (
      "MONTO",
      "MONEDA",
      "METODO_PAGO",
      "ID_CUENTA"
    )
    VALUES ($1, $2, $3, $4)
    RETURNING "ID_EG", "FECHA_EG"
  `,

  /**
   * Insertar detalle de egreso (vincula transacción con gasto)
   */
  insertEgDetalle: `
    INSERT INTO "GV"."EG_DETALLE" (
      "ID_EG",
      "ID_GASTO",
      "MONTO_APLICADO"
    )
    VALUES ($1, $2, $3)
    RETURNING *
  `,

  // ============================================
  // PAGO DE OBLIGACIONES
  // ============================================

  /**
   * Obtener gastos pendientes de pago (PENDIENTE o PAGO_PARCIAL)
   */
  getGastosPendientes: `
    SELECT
      "ID_GASTO",
      "FECHA_GASTO",
      "FECHA_VENCIMIENTO",
      "MONEDA",
      "MONTO_TOTAL",
      "ID_CATEGORIA",
      "CATEGORIA_NOMBRE",
      "ID_SUBCATEGORIA_INSUMO",
      "SUBCATEGORIA_NOMBRE",
      "PROVEEDOR",
      "NUM_COMPROBANTE",
      "DETALLE",
      "MONTO_PAGADO",
      "SALDO_PENDIENTE",
      "ESTADO_CALCULADO"
    FROM "GV"."V_GASTO_ESTADO"
    WHERE "CANCELADO" = false
      AND "ESTADO_CALCULADO" IN ('PENDIENTE', 'PAGO_PARCIAL')
    ORDER BY "FECHA_VENCIMIENTO" ASC NULLS LAST, "FECHA_GASTO" ASC
  `,

  /**
   * Obtener un gasto específico con su estado
   */
  getGastoEstado: `
    SELECT
      "ID_GASTO",
      "FECHA_GASTO",
      "FECHA_VENCIMIENTO",
      "MONEDA",
      "MONTO_TOTAL",
      "ID_CATEGORIA",
      "CATEGORIA_NOMBRE",
      "PROVEEDOR",
      "NUM_COMPROBANTE",
      "DETALLE",
      "MONTO_PAGADO",
      "SALDO_PENDIENTE",
      "ESTADO_CALCULADO"
    FROM "GV"."V_GASTO_ESTADO"
    WHERE "ID_GASTO" = $1
  `,

  /**
   * Obtener historial de pagos de un gasto
   */
  getHistorialPagosGasto: `
    SELECT
      et."ID_EG",
      et."FECHA_EG",
      et."MONTO",
      et."MONEDA",
      et."METODO_PAGO",
      et."ESTADO",
      ed."MONTO_APLICADO",
      ed."FECHA_APLICACION"
    FROM "GV"."EG_DETALLE" ed
    JOIN "GV"."EG_TRANSACCIONES" et ON ed."ID_EG" = et."ID_EG"
    WHERE ed."ID_GASTO" = $1
      AND et."ESTADO" = 'ACTIVO'
    ORDER BY et."FECHA_EG" DESC
  `
};

module.exports = queries;
