/**
 * Queries SQL para el módulo de Clientes
 */

const queries = {
  /**
   * Obtener todos los clientes
   */
  getAll: `
    SELECT
      "ID_CLIENT",
      "NOMBRE",
      "APELLIDO",
      "TELEFONO",
      "DIRECCION",
      "EMPRESA",
      "CREADO_EN"
    FROM "GV"."CLIENTE"
    ORDER BY "NOMBRE" ASC
  `,

  /**
   * Obtener cliente por ID
   */
  getById: `
    SELECT
      "ID_CLIENT",
      "NOMBRE",
      "APELLIDO",
      "TELEFONO",
      "DIRECCION",
      "EMPRESA",
      "CREADO_EN"
    FROM "GV"."CLIENTE"
    WHERE "ID_CLIENT" = $1
  `,

  /**
   * Insertar nuevo cliente
   */
  insert: `
    INSERT INTO "GV"."CLIENTE" (
      "NOMBRE",
      "APELLIDO",
      "TELEFONO",
      "DIRECCION",
      "EMPRESA"
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING "ID_CLIENT", "CREADO_EN"
  `,

  /**
   * Actualizar cliente
   */
  update: `
    UPDATE "GV"."CLIENTE"
    SET
      "NOMBRE" = $1,
      "APELLIDO" = $2,
      "TELEFONO" = $3,
      "DIRECCION" = $4,
      "EMPRESA" = $5
    WHERE "ID_CLIENT" = $6
    RETURNING *
  `,

  /**
   * Verificar si existe un cliente con el mismo nombre y teléfono
   */
  checkDuplicate: `
    SELECT "ID_CLIENT"
    FROM "GV"."CLIENTE"
    WHERE "NOMBRE" = $1 AND "TELEFONO" = $2
  `
};

module.exports = queries;
