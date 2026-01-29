-- =====================================================
-- CREAR TABLA CAMBIO_MONEDA
-- Ejecutar manualmente en la base de datos
-- =====================================================

CREATE TABLE "GV"."CAMBIO_MONEDA" (
  "ID_CAMBIO" SERIAL PRIMARY KEY,
  "FECHA_CAMBIO" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "ID_CUENTA_ORIGEN" INTEGER NOT NULL REFERENCES "GV"."CUENTA_DINERO"("ID_CUENTA"),
  "ID_CUENTA_DESTINO" INTEGER NOT NULL REFERENCES "GV"."CUENTA_DINERO"("ID_CUENTA"),
  "MONTO_ORIGEN" NUMERIC(14,2) NOT NULL,
  "MONEDA_ORIGEN" VARCHAR(3) NOT NULL,
  "MONTO_DESTINO" NUMERIC(14,2) NOT NULL,
  "MONEDA_DESTINO" VARCHAR(3) NOT NULL,
  "FACTOR_CONVERSION" NUMERIC(10,4) NOT NULL,
  "NOTA" TEXT,
  "ESTADO" VARCHAR(20) DEFAULT 'ACTIVO',
  "CREADO_EN" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para mejorar performance
CREATE INDEX idx_cambio_moneda_fecha ON "GV"."CAMBIO_MONEDA" ("FECHA_CAMBIO" DESC);
CREATE INDEX idx_cambio_moneda_origen ON "GV"."CAMBIO_MONEDA" ("ID_CUENTA_ORIGEN");
CREATE INDEX idx_cambio_moneda_destino ON "GV"."CAMBIO_MONEDA" ("ID_CUENTA_DESTINO");

-- Comentarios
COMMENT ON TABLE "GV"."CAMBIO_MONEDA" IS 'Registro de cambios de moneda y transferencias entre cuentas';
COMMENT ON COLUMN "GV"."CAMBIO_MONEDA"."FACTOR_CONVERSION" IS 'Factor de conversion: 1 USD = X UYU. Para transferencias misma moneda = 1';
