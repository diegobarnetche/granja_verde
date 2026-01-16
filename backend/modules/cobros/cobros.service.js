/**
 * cobros.service.js
 * Lógica de negocio para el módulo de cobros
 * Tablas: VENTAS, ING_TRANSACCIONES, ING_DETALLE
 */

const SQL = require('./cobros.sql');
const { calcularEstadoPago } = require('./cobros.validators');

class CobrosService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Obtiene lista de clientes con saldo pendiente > 0
   * @returns {Promise<Array>}
   */
  async getClientesConDeuda() {
    const result = await this.pool.query(SQL.getClientesConDeuda);
    return result.rows;
  }

  /**
   * Obtiene las ventas pendientes de un cliente
   * @param {number} idCliente
   * @returns {Promise<Array>}
   */
  async getVentasPendientes(idCliente) {
    const result = await this.pool.query(SQL.getVentasPendientesByCliente, [idCliente]);
    return result.rows;
  }

  /**
   * Obtiene la deuda total de un cliente
   * @param {number} idCliente
   * @returns {Promise<number>}
   */
  async getDeudaCliente(idCliente) {
    const result = await this.pool.query(SQL.getDeudaCliente, [idCliente]);
    return Number(result.rows[0].deuda_total) || 0;
  }

  /**
   * Registra un pago con múltiples líneas de pago
   * Aplica el pago a las ventas pendientes del cliente (FIFO)
   *
   * @param {Object} data - Datos validados del pago
   * @returns {Promise<Object>} - Resultado del pago
   */
  async registrarPago(data) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const { ID_CLIENTE, MODE, PAYMENT_LINES, TOTAL_PAGO } = data;
      const fechaPago = new Date();

      // 1. Verificar que el cliente tenga deuda
      const deudaResult = await client.query(SQL.getDeudaCliente, [ID_CLIENTE]);
      const deudaTotal = Number(deudaResult.rows[0].deuda_total) || 0;

      if (deudaTotal <= 0) {
        const error = new Error('El cliente no tiene deuda pendiente');
        error.statusCode = 400;
        throw error;
      }

      // 2. Validar monto según modo
      if (MODE === 'FULL' && TOTAL_PAGO < deudaTotal) {
        // En modo FULL, permitimos pagar menos pero aplicamos todo
        // (el usuario podría no tener suficiente para pagar toda la deuda)
      }

      if (MODE === 'PARTIAL' && TOTAL_PAGO > deudaTotal) {
        const error = new Error(`El monto del pago ($${TOTAL_PAGO}) excede la deuda total ($${deudaTotal})`);
        error.statusCode = 400;
        throw error;
      }

      // 3. Insertar cada línea de pago en ING_TRANSACCIONES
      const transaccionesCreadas = [];
      for (const line of PAYMENT_LINES) {
        const ingResult = await client.query(SQL.insertIngTransaccion, [
          fechaPago,
          ID_CLIENTE,
          line.monto,
          line.metodo_pago,
          line.referencia || null,
          line.nota || null,
          'ACTIVO',
        ]);
        transaccionesCreadas.push({
          ID_ING: ingResult.rows[0].ID_ING,
          monto: line.monto,
          metodo_pago: line.metodo_pago,
        });
      }

      // 4. Obtener ventas pendientes del cliente (FIFO por fecha)
      const ventasResult = await client.query(SQL.getVentasPendientesByCliente, [ID_CLIENTE]);
      const ventasPendientes = ventasResult.rows;

      // 5. Distribuir el pago entre las ventas (FIFO)
      let montoRestante = TOTAL_PAGO;
      const aplicaciones = [];
      const ventasActualizadas = [];

      for (const venta of ventasPendientes) {
        if (montoRestante <= 0) break;

        const saldoVenta = Number(venta.SALDO_PENDIENTE);
        const montoAplicar = Math.min(montoRestante, saldoVenta);
        const nuevoSaldo = Math.round((saldoVenta - montoAplicar) * 100) / 100;
        const nuevoEstado = calcularEstadoPago(nuevoSaldo, Number(venta.TOTAL));

        // Actualizar saldo de la venta
        await client.query(SQL.updateSaldoVenta, [
          venta.ID_VENTA,
          nuevoSaldo,
          nuevoEstado,
        ]);

        ventasActualizadas.push({
          ID_VENTA: venta.ID_VENTA,
          saldo_anterior: saldoVenta,
          monto_aplicado: montoAplicar,
          saldo_nuevo: nuevoSaldo,
          estado_nuevo: nuevoEstado,
        });

        // Registrar en ING_DETALLE (asociar con la primera transacción para simplificar)
        // En un sistema más complejo se podría distribuir proporcionalmente
        const idIngPrincipal = transaccionesCreadas[0].ID_ING;
        const detalleResult = await client.query(SQL.insertIngDetalle, [
          idIngPrincipal,
          venta.ID_VENTA,
          montoAplicar,
          fechaPago,
        ]);

        aplicaciones.push({
          ID_ING_DET: detalleResult.rows[0].ID_ING_DET,
          ID_VENTA: venta.ID_VENTA,
          MONTO_APLICADO: montoAplicar,
        });

        montoRestante = Math.round((montoRestante - montoAplicar) * 100) / 100;
      }

      await client.query('COMMIT');

      // Calcular nueva deuda
      const nuevaDeuda = Math.round((deudaTotal - (TOTAL_PAGO - montoRestante)) * 100) / 100;

      return {
        status: 'OK',
        message: 'Pago registrado exitosamente',
        payload: {
          transacciones: transaccionesCreadas,
          total_pagado: TOTAL_PAGO,
          total_aplicado: Math.round((TOTAL_PAGO - montoRestante) * 100) / 100,
          deuda_anterior: deudaTotal,
          deuda_nueva: nuevaDeuda,
          ventas_afectadas: ventasActualizadas,
          detalle_aplicacion: aplicaciones,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene historial de pagos de un cliente
   * @param {number} idCliente
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<Array>}
   */
  async getHistorialPagos(idCliente, limit = 50, offset = 0) {
    const result = await this.pool.query(SQL.getHistorialPagosCliente, [idCliente, limit, offset]);
    return result.rows;
  }
}

module.exports = CobrosService;
