-- =====================================================
-- MODIFICAR VISTA V_SALDO_CUENTA_TIEMPO_REAL
-- Para incluir movimientos de CAMBIO_MONEDA
-- Ejecutar DESPUÉS de crear la tabla CAMBIO_MONEDA
-- =====================================================

-- Primero eliminar la vista existente
DROP VIEW IF EXISTS "GV"."V_SALDO_CUENTA_TIEMPO_REAL";

-- Crear la vista actualizada
CREATE VIEW "GV"."V_SALDO_CUENTA_TIEMPO_REAL" AS
SELECT
    c."ID_CUENTA",
    c."NOMBRE",
    c."TIPO",
    c."MONEDA",
    COALESCE(si."FECHA_INICIO", '1899-12-31 20:15:09-03:44:51'::timestamp with time zone) AS "FECHA_INICIO",
    COALESCE(si."SALDO_INICIAL", 0::numeric)::numeric(14,2) AS "SALDO_INICIAL",
    COALESCE(ing.total_ing, 0::numeric)::numeric(14,2) AS "INGRESOS_DESDE_INICIO",
    COALESCE(egr.total_egr, 0::numeric)::numeric(14,2) AS "EGRESOS_DESDE_INICIO",
    -- Nuevos campos para cambios
    COALESCE(cambios_in.total_in, 0::numeric)::numeric(14,2) AS "CAMBIOS_INGRESO",
    COALESCE(cambios_out.total_out, 0::numeric)::numeric(14,2) AS "CAMBIOS_EGRESO",
    -- Saldo teórico actualizado
    (
        COALESCE(si."SALDO_INICIAL", 0::numeric)
        + COALESCE(ing.total_ing, 0::numeric)
        - COALESCE(egr.total_egr, 0::numeric)
        + COALESCE(cambios_in.total_in, 0::numeric)
        - COALESCE(cambios_out.total_out, 0::numeric)
    )::numeric(14,2) AS "SALDO_TEORICO"
FROM "GV"."CUENTA_DINERO" c
LEFT JOIN "GV"."SALDO_INICIAL" si ON si."ID_CUENTA" = c."ID_CUENTA"
-- Ingresos desde ING_TRANSACCIONES
LEFT JOIN LATERAL (
    SELECT sum(it."MONTO") AS total_ing
    FROM "GV"."ING_TRANSACCIONES" it
    WHERE it."ESTADO" = 'ACTIVO'::text
      AND it."ID_CUENTA" = c."ID_CUENTA"
      AND it."FECHA_ING" >= COALESCE(si."FECHA_INICIO", '1899-12-31 20:15:09-03:44:51'::timestamp with time zone)
) ing ON true
-- Egresos desde EG_TRANSACCIONES
LEFT JOIN LATERAL (
    SELECT sum(et."MONTO") AS total_egr
    FROM "GV"."EG_TRANSACCIONES" et
    WHERE et."ESTADO" = 'ACTIVO'::text
      AND et."ID_CUENTA" = c."ID_CUENTA"
      AND et."FECHA_EG" >= COALESCE(si."FECHA_INICIO", '1899-12-31 20:15:09-03:44:51'::timestamp with time zone)
) egr ON true
-- Ingresos desde CAMBIO_MONEDA (cuando la cuenta es destino)
LEFT JOIN LATERAL (
    SELECT sum(cm."MONTO_DESTINO") AS total_in
    FROM "GV"."CAMBIO_MONEDA" cm
    WHERE cm."ESTADO" = 'ACTIVO'::text
      AND cm."ID_CUENTA_DESTINO" = c."ID_CUENTA"
      AND cm."FECHA_CAMBIO" >= COALESCE(si."FECHA_INICIO", '1899-12-31 20:15:09-03:44:51'::timestamp with time zone)
) cambios_in ON true
-- Egresos desde CAMBIO_MONEDA (cuando la cuenta es origen)
LEFT JOIN LATERAL (
    SELECT sum(cm."MONTO_ORIGEN") AS total_out
    FROM "GV"."CAMBIO_MONEDA" cm
    WHERE cm."ESTADO" = 'ACTIVO'::text
      AND cm."ID_CUENTA_ORIGEN" = c."ID_CUENTA"
      AND cm."FECHA_CAMBIO" >= COALESCE(si."FECHA_INICIO", '1899-12-31 20:15:09-03:44:51'::timestamp with time zone)
) cambios_out ON true;

-- Comentario de la vista
COMMENT ON VIEW "GV"."V_SALDO_CUENTA_TIEMPO_REAL" IS 'Saldo de cuentas en tiempo real, incluye ING_TRANSACCIONES, EG_TRANSACCIONES y CAMBIO_MONEDA';
