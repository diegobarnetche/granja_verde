/**
 * cobros.service.js
 * Lógica de negocio para el módulo de cobros
 * Tablas: VENTAS, ING_TRANSACCIONES, ING_DETALLE
 */

const SQL = require('./cobros.sql');
const { calcularEstadoPago } = require('./cobros.validators');
const { registrarPagosYAplicar } = require('../shared/pagos.service');

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
   * Usa el servicio compartido de pagos para mantener consistencia
   * con el flujo de pago inicial en Ventas.
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
      if (MODE === 'PARTIAL' && TOTAL_PAGO > deudaTotal) {
        const error = new Error(`El monto del pago ($${TOTAL_PAGO}) excede la deuda total ($${deudaTotal})`);
        error.statusCode = 400;
        throw error;
      }

      // 3. Usar el servicio compartido de pagos con estrategia FIFO
      const resultadoPago = await registrarPagosYAplicar(client, {
        idCliente: ID_CLIENTE,
        idVenta: null, // No aplica para FIFO
        totalVenta: null, // No aplica para FIFO
        paymentLines: PAYMENT_LINES,
        strategy: 'FIFO',
        fecha: fechaPago,
      });

      await client.query('COMMIT');

      // Calcular nueva deuda
      const totalAplicado = resultadoPago.ventas_actualizadas.reduce(
        (sum, v) => sum + v.monto_aplicado, 0
      );
      const nuevaDeuda = Math.round((deudaTotal - totalAplicado) * 100) / 100;

      return {
        status: 'OK',
        message: 'Pago registrado exitosamente',
        payload: {
          transacciones: resultadoPago.transacciones,
          total_pagado: TOTAL_PAGO,
          total_aplicado: totalAplicado,
          deuda_anterior: deudaTotal,
          deuda_nueva: nuevaDeuda,
          ventas_afectadas: resultadoPago.ventas_actualizadas,
          detalle_aplicacion: resultadoPago.aplicaciones,
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
