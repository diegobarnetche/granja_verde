-- constraints.sql
-- Foreign Keys sugeridas para el módulo de ventas/pedidos
-- NO ejecutar automáticamente - revisar y aplicar manualmente cuando corresponda

-- ============================================================================
-- 1. FK: VENTAS.PED_ID -> PEDIDOS.PED_ID (relación 1-1)
-- ============================================================================
-- Esta FK asegura que si una venta tiene un PED_ID, ese pedido debe existir.
-- UNIQUE en PED_ID garantiza la relación 1-1 (una venta solo puede tener un pedido)

-- Verificar si ya existe el constraint UNIQUE en PED_ID
-- Si no existe, agregarlo primero:
ALTER TABLE "GV"."VENTAS"
  ADD CONSTRAINT "UQ_VENTAS_PED_ID" UNIQUE ("PED_ID");

-- Luego agregar la FK:
ALTER TABLE "GV"."VENTAS"
  ADD CONSTRAINT "FK_VENTAS_PEDIDOS"
  FOREIGN KEY ("PED_ID")
  REFERENCES "GV"."PEDIDOS"("PED_ID")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================================
-- 2. FK: VENTAS.CLIENTE_ID -> CLIENTE.ID_CLIENT
-- ============================================================================
-- Asegura que el cliente de la venta exista

ALTER TABLE "GV"."VENTAS"
  ADD CONSTRAINT "FK_VENTAS_CLIENTE"
  FOREIGN KEY ("CLIENTE_ID")
  REFERENCES "GV"."CLIENTE"("ID_CLIENT")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================================
-- 3. FK: PEDIDOS.CLIENTE_ID -> CLIENTE.ID_CLIENT
-- ============================================================================
-- Asegura que el cliente del pedido exista

ALTER TABLE "GV"."PEDIDOS"
  ADD CONSTRAINT "FK_PEDIDOS_CLIENTE"
  FOREIGN KEY ("CLIENTE_ID")
  REFERENCES "GV"."CLIENTE"("ID_CLIENT")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- ============================================================================
-- 4. FK: PEDIDOS_DETALLE.PED_ID -> PEDIDOS.PED_ID
-- ============================================================================
-- Asegura que el pedido del detalle exista

ALTER TABLE "GV"."PEDIDOS_DETALLE"
  ADD CONSTRAINT "FK_PEDIDOS_DETALLE_PEDIDO"
  FOREIGN KEY ("PED_ID")
  REFERENCES "GV"."PEDIDOS"("PED_ID")
  ON DELETE CASCADE  -- Si se elimina el pedido, eliminar su detalle
  ON UPDATE CASCADE;

-- ============================================================================
-- 5. FK: PEDIDOS_DETALLE.PRODUCTO_ID -> PRODUCTO.ITEM (BIGINT)
-- ============================================================================
-- IMPORTANTE: La PK de PRODUCTO es "ITEM" (BIGINT), NO "ID_PRODUCTO"
-- Esta FK asegura que el producto del detalle exista

ALTER TABLE "GV"."PEDIDOS_DETALLE"
  ADD CONSTRAINT "FK_PEDIDOS_DETALLE_PRODUCTO"
  FOREIGN KEY ("PRODUCTO_ID")
  REFERENCES "GV"."PRODUCTO"("ITEM")
  ON DELETE RESTRICT  -- No permitir eliminar productos que tienen pedidos
  ON UPDATE CASCADE;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- - Antes de ejecutar estos scripts, verificar que las columnas existan y sean del tipo correcto
-- - Verificar que no haya datos huérfanos que violen las FKs
-- - Si ya existen constraints con esos nombres, primero hay que eliminarlos:
--   ALTER TABLE "GV"."VENTAS" DROP CONSTRAINT IF EXISTS "FK_VENTAS_PEDIDOS";
-- - Ejecutar uno a la vez y validar que no haya errores
