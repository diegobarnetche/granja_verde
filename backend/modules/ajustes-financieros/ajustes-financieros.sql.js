/**
 * Queries SQL para el módulo de Ajustes Financieros
 * Esquema: GV
 * Tablas: AF_TRANSACCIONES, AF_DETALLE, DIM_AJUSTE_FINANCIERO
 */

module.exports = {
  // ============================================
  // DIMENSIONES (Tipos de Ajuste)
  // ============================================

  getDimensionesActivas: `
    SELECT
      "ID_TIPO_AJUSTE",
      "CODIGO",
      "DESCRIPCION",
      "NATURALEZA",
      "ACTIVO",
      "CREADO_EN"
    FROM "GV"."DIM_AJUSTE_FINANCIERO"
    WHERE "ACTIVO" = TRUE
    ORDER BY "CODIGO"
  `,

  getDimensionById: `
    SELECT
      "ID_TIPO_AJUSTE",
      "CODIGO",
      "DESCRIPCION",
      "NATURALEZA",
      "ACTIVO",
      "CREADO_EN"
    FROM "GV"."DIM_AJUSTE_FINANCIERO"
    WHERE "ID_TIPO_AJUSTE" = $1
  `,

  createDimension: `
    INSERT INTO "GV"."DIM_AJUSTE_FINANCIERO" (
      "CODIGO",
      "DESCRIPCION",
      "NATURALEZA"
    )
    VALUES ($1, $2, $3)
    RETURNING *
  `,

  updateDimension: `
    UPDATE "GV"."DIM_AJUSTE_FINANCIERO"
    SET
      "CODIGO" = $2,
      "DESCRIPCION" = $3,
      "NATURALEZA" = $4,
      "ACTIVO" = $5
    WHERE "ID_TIPO_AJUSTE" = $1
    RETURNING *
  `,

  // ============================================
  // AJUSTES FINANCIEROS (Transacciones)
  // ============================================

  getAll: `
    SELECT
      af."ID_AF",
      af."FECHA_AF",
      af."ID_TIPO_AJUSTE",
      dim."CODIGO" AS "TIPO_CODIGO",
      dim."DESCRIPCION" AS "TIPO_DESCRIPCION",
      dim."NATURALEZA" AS "TIPO_NATURALEZA",
      af."MONTO",
      af."MONEDA",
      af."ID_CUENTA",
      c."NOMBRE" AS "NOMBRE_CUENTA",
      af."REFERENCIA",
      af."NOTA",
      af."ESTADO",
      af."CREADO_EN",
      af."ACTUALIZADO_EN"
    FROM "GV"."AF_TRANSACCIONES" af
    INNER JOIN "GV"."DIM_AJUSTE_FINANCIERO" dim ON af."ID_TIPO_AJUSTE" = dim."ID_TIPO_AJUSTE"
    LEFT JOIN "GV"."CUENTA_DINERO" c ON af."ID_CUENTA" = c."ID_CUENTA"
    WHERE 1=1
      AND ($1::bigint IS NULL OR af."ID_TIPO_AJUSTE" = $1)
      AND ($2::date IS NULL OR af."FECHA_AF" >= $2)
      AND ($3::date IS NULL OR af."FECHA_AF" <= $3)
      AND ($4::text IS NULL OR af."ESTADO" = $4)
      AND ($5::text IS NULL OR af."MONEDA" = $5)
    ORDER BY af."FECHA_AF" DESC, af."ID_AF" DESC
  `,

  getById: `
    SELECT
      af."ID_AF",
      af."FECHA_AF",
      af."ID_TIPO_AJUSTE",
      dim."CODIGO" AS "TIPO_CODIGO",
      dim."DESCRIPCION" AS "TIPO_DESCRIPCION",
      dim."NATURALEZA" AS "TIPO_NATURALEZA",
      af."MONTO",
      af."MONEDA",
      af."ID_CUENTA",
      c."NOMBRE" AS "NOMBRE_CUENTA",
      af."REFERENCIA",
      af."NOTA",
      af."ESTADO",
      af."CREADO_EN",
      af."ACTUALIZADO_EN"
    FROM "GV"."AF_TRANSACCIONES" af
    INNER JOIN "GV"."DIM_AJUSTE_FINANCIERO" dim ON af."ID_TIPO_AJUSTE" = dim."ID_TIPO_AJUSTE"
    LEFT JOIN "GV"."CUENTA_DINERO" c ON af."ID_CUENTA" = c."ID_CUENTA"
    WHERE af."ID_AF" = $1
  `,

  getDetalleByAjuste: `
    SELECT
      det."ID_AF_DET",
      det."ID_AF",
      det."ID_GASTO",
      det."ID_VENTA",
      det."MONTO_APLICADO",
      det."PORCENTAJE",
      det."BASE_CALCULO",
      det."FECHA_APLICACION",
      g."FECHA_GASTO",
      g."PROVEEDOR",
      g."NUM_COMPROBANTE" AS "GASTO_COMPROBANTE",
      v."FECHA_VENTA",
      v."ID_CLIENTE"
    FROM "GV"."AF_DETALLE" det
    LEFT JOIN "GV"."GASTO_V2" g ON det."ID_GASTO" = g."ID_GASTO"
    LEFT JOIN "GV"."VENTAS" v ON det."ID_VENTA" = v."ID_VENTA"
    WHERE det."ID_AF" = $1
    ORDER BY det."ID_AF_DET"
  `,

  createTransaccion: `
    INSERT INTO "GV"."AF_TRANSACCIONES" (
      "FECHA_AF",
      "ID_TIPO_AJUSTE",
      "MONTO",
      "MONEDA",
      "ID_CUENTA",
      "REFERENCIA",
      "NOTA",
      "ESTADO"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVO')
    RETURNING "ID_AF"
  `,

  createDetalle: `
    INSERT INTO "GV"."AF_DETALLE" (
      "ID_AF",
      "ID_GASTO",
      "ID_VENTA",
      "MONTO_APLICADO",
      "PORCENTAJE",
      "BASE_CALCULO"
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,

  anularAjuste: `
    UPDATE "GV"."AF_TRANSACCIONES"
    SET "ESTADO" = 'ANULADO'
    WHERE "ID_AF" = $1 AND "ESTADO" = 'ACTIVO'
    RETURNING *
  `,

  // ============================================
  // VALIDACIONES
  // ============================================

  getCuentaById: `
    SELECT "ID_CUENTA", "NOMBRE", "MONEDA", "ACTIVA"
    FROM "GV"."CUENTA_DINERO"
    WHERE "ID_CUENTA" = $1
  `,

  getGastoById: `
    SELECT "ID_GASTO", "MONEDA", "MONTO_TOTAL", "CANCELADO"
    FROM "GV"."GASTO_V2"
    WHERE "ID_GASTO" = $1
  `,

  getVentaById: `
    SELECT "ID_VENTA", "TOTAL", "ESTADO"
    FROM "GV"."VENTAS"
    WHERE "ID_VENTA" = $1
  `
};
