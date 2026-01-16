/**
 * Queries SQL para el módulo de Gastos
 */

const queries = {
  /**
   * Obtener todos los gastos ordenados por fecha descendente
   */
  getAll: `
    SELECT
      "ID_GASTO",
      "FECHA",
      "MONTO",
      "MONEDA",
      "METODO_PAGO",
      "CATEGORIA",
      "ESTADO",
      "CREADO_EN"
    FROM "GV"."GASTO"
    ORDER BY "FECHA" DESC
  `,

  /**
   * Crear un nuevo gasto
   */
  create: `
    INSERT INTO "GV"."GASTO" (
      "FECHA",
      "MONTO",
      "MONEDA",
      "METODO_PAGO",
      "CATEGORIA",
      "ESTADO",
      "CREADO_EN"
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `,

  /**
   * Actualizar un gasto existente
   */
  update: `
    UPDATE "GV"."GASTO"
    SET
      "FECHA" = $1,
      "MONTO" = $2,
      "MONEDA" = $3,
      "METODO_PAGO" = $4,
      "CATEGORIA" = $5,
      "ESTADO" = $6
    WHERE "ID_GASTO" = $7
    RETURNING *
  `,

  /**
   * Eliminar un gasto
   */
  delete: `
    DELETE FROM "GV"."GASTO"
    WHERE "ID_GASTO" = $1
    RETURNING *
  `
};

module.exports = queries;
