/**
 * cambios.service.js
 * Lógica de negocio para cambios de moneda y transferencias
 * Tablas: CAMBIO_MONEDA, CUENTA_DINERO, V_SALDO_CUENTA_TIEMPO_REAL
 */

const SQL = require('./cambios.sql');

class CambiosService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Obtiene todas las cuentas con su saldo actual
   * @returns {Promise<Array>}
   */
  async getCuentasConSaldo() {
    const result = await this.pool.query(SQL.getCuentasConSaldo);
    return result.rows;
  }

  /**
   * Obtiene el saldo de una cuenta específica
   * @param {number} idCuenta
   * @returns {Promise<Object>}
   */
  async getSaldoCuenta(idCuenta) {
    const result = await this.pool.query(SQL.getSaldoCuenta, [idCuenta]);
    if (result.rows.length === 0) {
      throw new Error('Cuenta no encontrada');
    }
    return result.rows[0];
  }

  /**
   * Registra un cambio de moneda o transferencia
   *
   * @param {Object} data
   * @param {number} data.id_cuenta_origen - ID cuenta de origen
   * @param {number} data.id_cuenta_destino - ID cuenta de destino
   * @param {number} data.monto_input - Monto ingresado por el usuario
   * @param {string} data.moneda_input - 'ORIGEN' o 'DESTINO' (en cual moneda ingresó)
   * @param {number} data.factor_conversion - Factor de conversión (1 USD = X UYU)
   * @param {string} data.nota - Nota opcional
   * @returns {Promise<Object>}
   */
  async registrarCambio(data) {
    const {
      id_cuenta_origen,
      id_cuenta_destino,
      monto_input,
      moneda_input,
      factor_conversion,
      nota
    } = data;

    // Validaciones básicas
    if (!id_cuenta_origen || !id_cuenta_destino) {
      throw new Error('Cuenta origen y destino son requeridas');
    }

    if (id_cuenta_origen === id_cuenta_destino) {
      throw new Error('Cuenta origen y destino deben ser diferentes');
    }

    if (!monto_input || monto_input <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (!factor_conversion || factor_conversion <= 0) {
      throw new Error('El factor de conversión debe ser mayor a 0');
    }

    if (!['ORIGEN', 'DESTINO'].includes(moneda_input)) {
      throw new Error('moneda_input debe ser ORIGEN o DESTINO');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Obtener info de ambas cuentas
      const [cuentaOrigenResult, cuentaDestinoResult] = await Promise.all([
        client.query(SQL.getSaldoCuenta, [id_cuenta_origen]),
        client.query(SQL.getSaldoCuenta, [id_cuenta_destino])
      ]);

      if (cuentaOrigenResult.rows.length === 0) {
        throw new Error('Cuenta origen no encontrada');
      }
      if (cuentaDestinoResult.rows.length === 0) {
        throw new Error('Cuenta destino no encontrada');
      }

      const cuentaOrigen = cuentaOrigenResult.rows[0];
      const cuentaDestino = cuentaDestinoResult.rows[0];

      const monedaOrigen = cuentaOrigen.MONEDA;
      const monedaDestino = cuentaDestino.MONEDA;
      const saldoOrigen = Number(cuentaOrigen.SALDO_TEORICO);

      // 2. Calcular montos según moneda_input
      let montoOrigen, montoDestino;

      if (monedaOrigen === monedaDestino) {
        // Transferencia entre misma moneda - factor debe ser 1
        montoOrigen = monto_input;
        montoDestino = monto_input;
      } else if (moneda_input === 'ORIGEN') {
        // Usuario ingresó monto en moneda origen
        montoOrigen = monto_input;

        if (monedaOrigen === 'UYU' && monedaDestino === 'USD') {
          // UYU -> USD: dividir por factor
          montoDestino = monto_input / factor_conversion;
        } else if (monedaOrigen === 'USD' && monedaDestino === 'UYU') {
          // USD -> UYU: multiplicar por factor
          montoDestino = monto_input * factor_conversion;
        } else {
          throw new Error(`Conversión no soportada: ${monedaOrigen} -> ${monedaDestino}`);
        }
      } else {
        // Usuario ingresó monto en moneda destino
        montoDestino = monto_input;

        if (monedaOrigen === 'UYU' && monedaDestino === 'USD') {
          // Quiere X USD, calcular UYU necesarios
          montoOrigen = monto_input * factor_conversion;
        } else if (monedaOrigen === 'USD' && monedaDestino === 'UYU') {
          // Quiere X UYU, calcular USD necesarios
          montoOrigen = monto_input / factor_conversion;
        } else {
          throw new Error(`Conversión no soportada: ${monedaOrigen} -> ${monedaDestino}`);
        }
      }

      // Redondear a 2 decimales
      montoOrigen = Math.round(montoOrigen * 100) / 100;
      montoDestino = Math.round(montoDestino * 100) / 100;

      // 3. Validar saldo suficiente
      if (saldoOrigen < montoOrigen) {
        throw new Error(
          `Saldo insuficiente en ${cuentaOrigen.NOMBRE}. ` +
          `Disponible: ${saldoOrigen.toFixed(2)} ${monedaOrigen}, ` +
          `Requerido: ${montoOrigen.toFixed(2)} ${monedaOrigen}`
        );
      }

      // 4. Insertar cambio
      const cambioResult = await client.query(SQL.insertCambio, [
        id_cuenta_origen,
        id_cuenta_destino,
        montoOrigen,
        monedaOrigen,
        montoDestino,
        monedaDestino,
        factor_conversion,
        nota || null
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        id_cambio: cambioResult.rows[0].ID_CAMBIO,
        fecha_cambio: cambioResult.rows[0].FECHA_CAMBIO,
        cuenta_origen: cuentaOrigen.NOMBRE,
        cuenta_destino: cuentaDestino.NOMBRE,
        monto_origen: montoOrigen,
        moneda_origen: monedaOrigen,
        monto_destino: montoDestino,
        moneda_destino: monedaDestino,
        factor_conversion,
        saldo_anterior_origen: saldoOrigen,
        saldo_nuevo_origen: Math.round((saldoOrigen - montoOrigen) * 100) / 100
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene historial de cambios
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<Array>}
   */
  async getHistorial(limit = 50, offset = 0) {
    const result = await this.pool.query(SQL.getHistorial, [limit, offset]);
    return result.rows;
  }
}

module.exports = CambiosService;
