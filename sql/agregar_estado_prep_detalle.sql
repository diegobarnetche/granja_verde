-- =====================================================
-- Script: agregar_estado_prep_detalle.sql
-- Descripcion: Agregar columna ESTADO_PREP a DETALLE_VENTAS
--              para manejar estados por linea de pedido
-- Fecha: 2026-01-30
-- =====================================================

-- 1. Agregar columna ESTADO_PREP con valor por defecto
ALTER TABLE "GV"."DETALLE_VENTAS"
ADD COLUMN IF NOT EXISTS "ESTADO_PREP" VARCHAR(20) DEFAULT 'PENDIENTE';

-- 2. Actualizar registros existentes que tengan NULL
UPDATE "GV"."DETALLE_VENTAS"
SET "ESTADO_PREP" = 'PENDIENTE'
WHERE "ESTADO_PREP" IS NULL;

-- 3. Agregar constraint para validar valores
-- (solo PENDIENTE o PREPARADO a nivel de linea, ENTREGADO es a nivel de pedido)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_detalle_estado_prep'
  ) THEN
    ALTER TABLE "GV"."DETALLE_VENTAS"
    ADD CONSTRAINT chk_detalle_estado_prep
    CHECK ("ESTADO_PREP" IN ('PENDIENTE', 'PREPARADO'));
  END IF;
END $$;

-- Verificar que se aplico correctamente
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'GV'
  AND table_name = 'DETALLE_VENTAS'
  AND column_name = 'ESTADO_PREP';
