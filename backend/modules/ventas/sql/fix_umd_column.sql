-- Script para corregir el tipo de dato de UMD en PEDIDOS_DETALLE
-- La columna UMD debe ser INTEGER, no TEXT

-- Primero, verificar si hay datos que no sean enteros
-- SELECT "UMD" FROM "GV"."PEDIDOS_DETALLE" WHERE "UMD" !~ '^[0-9]+$';

-- Si hay datos texto, primero eliminarlos o convertirlos
-- DELETE FROM "GV"."PEDIDOS_DETALLE" WHERE "UMD" !~ '^[0-9]+$';

-- Cambiar el tipo de dato de TEXT a INTEGER
ALTER TABLE "GV"."PEDIDOS_DETALLE"
  ALTER COLUMN "UMD" TYPE INTEGER
  USING "UMD"::INTEGER;

-- Verificar el cambio
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'GV' AND table_name = 'PEDIDOS_DETALLE' AND column_name = 'UMD';
