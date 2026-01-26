/**
 * pagos.service.js
 * Lógica compartida para registro de pagos
 * Usado por: Ventas (pago inicial) y Cobros (cobranzas)
 * Tablas: ING_TRANSACCIONES, ING_DETALLE, VENTAS
 */

const SQL = {
  // Insertar transacción de ingreso (pago)
  insertIngTransaccion: `
    INSERT INTO "GV"."ING_TRANSACCIONES" (
      "FECHA_ING",
      "ID_CLIENTE",
      "MONTO",
      "METODO_PAGO",
      "REFERENCIA",
      "NOTA",
      "ESTADO"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING "ID_ING"
  `,

  // Insertar detalle de aplicación de pago a venta
  insertIngDetalle: `
    INSERT INTO "GV"."ING_DETALLE" (
      "ID_ING",
      "ID_VENTA",
      "MONTO_APLICADO",
      "FECHA_APLICACION"
    ) VALUES ($1, $2, $3, $4)
    RETURNING "ID_ING_DET"
  `,

  // Actualizar saldo pendiente y estado de una venta
  updateSaldoVenta: `
    UPDATE "GV"."VENTAS"
    SET
      "SALDO_PENDIENTE" = $2,
      "ESTADO" = $3
    WHERE "ID_VENTA" = $1
    RETURNING "ID_VENTA", "SALDO_PENDIENTE", "ESTADO"
  `,

  // Obtener ventas pendientes de un cliente (FIFO por fecha)
  getVentasPendientesByCliente: `
    SELECT
      v."ID_VENTA",
      v."FECHA_VENTA",
      v."TOTAL",
      v."SALDO_PENDIENTE",
      v."ESTADO"
    FROM "GV"."VENTAS" v
    WHERE v."ID_CLIENTE" = $1
      AND v."SALDO_PENDIENTE" > 0
    ORDER BY v."FECHA_VENTA" ASC
  `,
};

const METODOS_PAGO_VALIDOS = ['DEBITO', 'CREDITO', 'TRANSFERENCIA', 'EFECTIVO', 'OTROS'];

/**
 * Calcula el estado de pago según saldo pendiente
 * @param {number} saldoPendiente
 * @param {number} total
 * @returns {string} 'PAGO' | 'PAGO PARCIAL' | 'PAGO PENDIENTE'
 */
function calcularEstadoPago(saldoPendiente, total) {
  if (saldoPendiente <= 0) return 'PAGO';
  if (saldoPendiente < total) return 'PAGO PARCIAL';
  return 'PAGO PENDIENTE';
}

/**
 * Valida las líneas de pago
 * @param {Array} paymentLines - [{monto, metodo_pago, referencia?, nota?}]
 * @returns {{ valid: boolean, errors: string[], totalPago: number }}
 */
function validarPaymentLines(paymentLines) {
  const errors = [];
  let totalPago = 0;

  if (!Array.isArray(paymentLines) || paymentLines.length === 0) {
    return { valid: false, errors: ['PAGOS debe ser un array con al menos 1 elemento'], totalPago: 0 };
  }

  paymentLines.forEach((line, index) => {
    // Validar monto
    const monto = Number(line.monto);
    if (isNaN(monto) || monto <= 0) {
      errors.push(`PAGOS[${index}].monto debe ser un número mayor a 0`);
    } else {
      totalPago += monto;
    }

    // Validar metodo_pago
    if (!line.metodo_pago || !METODOS_PAGO_VALIDOS.includes(line.metodo_pago)) {
      errors.push(`PAGOS[${index}].metodo_pago debe ser uno de: ${METODOS_PAGO_VALIDOS.join(', ')}`);
    }
  });

  totalPago = Math.round(totalPago * 100) / 100;

  return { valid: errors.length === 0, errors, totalPago };
}

/**
 * Registra líneas de pago y las aplica a ventas
 *
 * ESTRATEGIAS:
 * - 'DIRECT': Aplica todo el pago a una venta específica (usado en creación de venta)
 * - 'FIFO': Aplica el pago a las ventas pendientes del cliente, empezando por la más antigua
 *
 * @param {Object} dbClient - Cliente de transacción PostgreSQL (ya en BEGIN)
 * @param {Object} params
 * @param {number} params.idCliente - ID del cliente
 * @param {number|null} params.idVenta - ID de venta específica (solo para DIRECT)
 * @param {number} params.totalVenta - Total de la venta (solo para DIRECT, para validar)
 * @param {Array} params.paymentLines - [{monto, metodo_pago, referencia?, nota?}]
 * @param {string} params.strategy - 'DIRECT' | 'FIFO'
 * @param {Date} params.fecha - Fecha del pago
 * @returns {Promise<Object>} Resultado con transacciones creadas y aplicaciones
 */
async function registrarPagosYAplicar(dbClient, params) {
  const { idCliente, idVenta, totalVenta, paymentLines, strategy, fecha } = params;
  const fechaPago = fecha || new Date();

  // Calcular total de pagos
  const totalPago = paymentLines.reduce((sum, line) => sum + Number(line.monto), 0);
  const totalPagoRedondeado = Math.round(totalPago * 100) / 100;

  // 1. Insertar cada línea de pago en ING_TRANSACCIONES
  const transaccionesCreadas = [];
  for (const line of paymentLines) {
    const monto = Math.round(Number(line.monto) * 100) / 100;
    const ingResult = await dbClient.query(SQL.insertIngTransaccion, [
      fechaPago,
      idCliente,
      monto,
      line.metodo_pago,
      line.referencia || null,
      line.nota || null,
      'ACTIVO',
    ]);
    transaccionesCreadas.push({
      ID_ING: ingResult.rows[0].ID_ING,
      monto,
      metodo_pago: line.metodo_pago,
    });
  }

  // 2. Aplicar según estrategia
  const aplicaciones = [];
  const ventasActualizadas = [];

  if (strategy === 'DIRECT') {
    // Aplicación directa a una venta específica
    if (!idVenta || !totalVenta) {
      const error = new Error('DIRECT strategy requiere idVenta y totalVenta');
      error.statusCode = 500;
      throw error;
    }

    const montoAplicar = Math.min(totalPagoRedondeado, totalVenta);
    const nuevoSaldo = Math.round((totalVenta - montoAplicar) * 100) / 100;
    const nuevoEstado = calcularEstadoPago(nuevoSaldo, totalVenta);

    // Actualizar saldo de la venta
    await dbClient.query(SQL.updateSaldoVenta, [idVenta, nuevoSaldo, nuevoEstado]);

    ventasActualizadas.push({
      ID_VENTA: idVenta,
      saldo_anterior: totalVenta,
      monto_aplicado: montoAplicar,
      saldo_nuevo: nuevoSaldo,
      estado_nuevo: nuevoEstado,
    });

    // Registrar en ING_DETALLE (vincular con primera transacción)
    const idIngPrincipal = transaccionesCreadas[0].ID_ING;
    const detalleResult = await dbClient.query(SQL.insertIngDetalle, [
      idIngPrincipal,
      idVenta,
      montoAplicar,
      fechaPago,
    ]);

    aplicaciones.push({
      ID_ING_DET: detalleResult.rows[0].ID_ING_DET,
      ID_ING: idIngPrincipal,
      ID_VENTA: idVenta,
      MONTO_APLICADO: montoAplicar,
    });

  } else if (strategy === 'FIFO') {
    // Obtener ventas pendientes ordenadas por fecha
    const ventasResult = await dbClient.query(SQL.getVentasPendientesByCliente, [idCliente]);
    const ventasPendientes = ventasResult.rows;

    let montoRestante = totalPagoRedondeado;

    for (const venta of ventasPendientes) {
      if (montoRestante <= 0) break;

      const saldoVenta = Number(venta.SALDO_PENDIENTE);
      const montoAplicar = Math.min(montoRestante, saldoVenta);
      const nuevoSaldo = Math.round((saldoVenta - montoAplicar) * 100) / 100;
      const nuevoEstado = calcularEstadoPago(nuevoSaldo, Number(venta.TOTAL));

      // Actualizar saldo de la venta
      await dbClient.query(SQL.updateSaldoVenta, [venta.ID_VENTA, nuevoSaldo, nuevoEstado]);

      ventasActualizadas.push({
        ID_VENTA: venta.ID_VENTA,
        saldo_anterior: saldoVenta,
        monto_aplicado: montoAplicar,
        saldo_nuevo: nuevoSaldo,
        estado_nuevo: nuevoEstado,
      });

      // Registrar en ING_DETALLE
      const idIngPrincipal = transaccionesCreadas[0].ID_ING;
      const detalleResult = await dbClient.query(SQL.insertIngDetalle, [
        idIngPrincipal,
        venta.ID_VENTA,
        montoAplicar,
        fechaPago,
      ]);

      aplicaciones.push({
        ID_ING_DET: detalleResult.rows[0].ID_ING_DET,
        ID_ING: idIngPrincipal,
        ID_VENTA: venta.ID_VENTA,
        MONTO_APLICADO: montoAplicar,
      });

      montoRestante = Math.round((montoRestante - montoAplicar) * 100) / 100;
    }
  }

  return {
    transacciones: transaccionesCreadas,
    total_pagado: totalPagoRedondeado,
    aplicaciones,
    ventas_actualizadas: ventasActualizadas,
  };
}

module.exports = {
  registrarPagosYAplicar,
  validarPaymentLines,
  calcularEstadoPago,
  METODOS_PAGO_VALIDOS,
  SQL,
};
