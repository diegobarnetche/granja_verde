/**
 * Queries SQL para el módulo de Cambios de Moneda
 * Tablas: CAMBIO_MONEDA, CUENTA_DINERO, V_SALDO_CUENTA_TIEMPO_REAL
 */

const queries = {
  /**
   * Obtener todas las cuentas con saldo actual
   */
  getCuentasConSaldo: `
    SELECT
      "ID_CUENTA",
      "NOMBRE",
      "TIPO",
      "MONEDA",
      "SALDO_TEORICO"
    FROM "GV"."V_SALDO_CUENTA_TIEMPO_REAL"
    ORDER BY "NOMBRE"
  `,

  /**
   * Obtener saldo de una cuenta específica
   */
  getSaldoCuenta: `
    SELECT
      "ID_CUENTA",
      "NOMBRE",
      "MONEDA",
      "SALDO_TEORICO"
    FROM "GV"."V_SALDO_CUENTA_TIEMPO_REAL"
    WHERE "ID_CUENTA" = $1
  `,

  /**
   * Obtener info de cuenta por ID
   */
  getCuentaById: `
    SELECT
      "ID_CUENTA",
      "NOMBRE",
      "MONEDA"
    FROM "GV"."CUENTA_DINERO"
    WHERE "ID_CUENTA" = $1 AND "ACTIVA" = true
  `,

  /**
   * Insertar cambio de moneda
   */
  insertCambio: `
    INSERT INTO "GV"."CAMBIO_MONEDA" (
      "ID_CUENTA_ORIGEN",
      "ID_CUENTA_DESTINO",
      "MONTO_ORIGEN",
      "MONEDA_ORIGEN",
      "MONTO_DESTINO",
      "MONEDA_DESTINO",
      "FACTOR_CONVERSION",
      "NOTA"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING "ID_CAMBIO", "FECHA_CAMBIO"
  `,

  /**
   * Obtener historial de cambios
   */
  getHistorial: `
    SELECT
      cm."ID_CAMBIO",
      cm."FECHA_CAMBIO",
      cm."MONTO_ORIGEN",
      cm."MONEDA_ORIGEN",
      cm."MONTO_DESTINO",
      cm."MONEDA_DESTINO",
      cm."FACTOR_CONVERSION",
      cm."NOTA",
      cm."ESTADO",
      co."NOMBRE" AS "CUENTA_ORIGEN_NOMBRE",
      cd."NOMBRE" AS "CUENTA_DESTINO_NOMBRE"
    FROM "GV"."CAMBIO_MONEDA" cm
    JOIN "GV"."CUENTA_DINERO" co ON cm."ID_CUENTA_ORIGEN" = co."ID_CUENTA"
    JOIN "GV"."CUENTA_DINERO" cd ON cm."ID_CUENTA_DESTINO" = cd."ID_CUENTA"
    WHERE cm."ESTADO" = 'ACTIVO'
    ORDER BY cm."FECHA_CAMBIO" DESC
    LIMIT $1 OFFSET $2
  `
};

module.exports = queries;
