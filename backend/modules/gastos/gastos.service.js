/**
 * Capa de lógica de negocio para Gastos V2
 * Maneja transacciones atómicas para GASTO_V2, EG_TRANSACCIONES, EG_DETALLE
 */
const queries = require('./gastos.sql');
const { validateExpensesBatch, determinePaymentScenario } = require('./gastos.validators');

class GastosService {
  constructor(pool) {
    this.pool = pool;
  }

  // ============================================
  // CATÁLOGOS
  // ============================================

  async getCategorias() {
    const result = await this.pool.query(queries.getCategorias);
    return result.rows;
  }

  async getSubcategorias(categoriaId) {
    const result = await this.pool.query(queries.getSubcategorias, [categoriaId]);
    return result.rows;
  }

  // ============================================
  // LECTURAS
  // ============================================

  async getAllGastos() {
    const result = await this.pool.query(queries.getAll);
    return result.rows;
  }

  async getGastoById(id) {
    const gastoResult = await this.pool.query(queries.getById, [id]);
    if (gastoResult.rows.length === 0) {
      throw new Error('Gasto no encontrado');
    }

    const gasto = gastoResult.rows[0];
    const transResult = await this.pool.query(queries.getTransaccionesByGasto, [id]);
    gasto.transacciones = transResult.rows;

    return gasto;
  }

  // ============================================
  // MAPEO DE CUENTAS (Backend-only)
  // ============================================

  /**
   * Resuelve el ID_CUENTA basado en método de pago y moneda
   * EFECTIVO -> CAJA {MONEDA}
   * TRANSFERENCIA/DEBITO/OTRO -> BROU {MONEDA}
   */
  async resolveAccountId(client, metodoPago, moneda) {
    let nombreCuenta;

    if (metodoPago === 'EFECTIVO') {
      nombreCuenta = `CAJA ${moneda}`;
    } else {
      // TRANSFERENCIA, DEBITO, OTRO
      nombreCuenta = `BROU ${moneda}`;
    }

    const result = await client.query(queries.getCuentaByNombre, [nombreCuenta]);

    if (result.rows.length === 0) {
      throw new Error(`Cuenta no encontrada: ${nombreCuenta}. Verifique que exista en GV.CUENTA_DINERO`);
    }

    return result.rows[0].ID_CUENTA;
  }

  // ============================================
  // CREACIÓN DE GASTOS (BATCH)
  // ============================================

  /**
   * Crea múltiples gastos en una transacción atómica
   * Soporta los 3 escenarios: FULL, PARTIAL, NONE
   */
  async createExpensesBatch(payload) {
    // Validar payload
    const validation = validateExpensesBatch(payload);
    if (!validation.valid) {
      const error = new Error('Validación fallida');
      error.validationErrors = validation.errors;
      error.statusCode = 400;
      throw error;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const createdExpenses = [];

      for (const expense of payload.expenses) {
        const createdExpense = await this.createSingleExpense(client, expense);
        createdExpenses.push(createdExpense);
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: `${createdExpenses.length} gasto(s) creado(s) exitosamente`,
        data: createdExpenses
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en createExpensesBatch:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Crea un gasto individual dentro de una transacción existente
   */
  async createSingleExpense(client, expense) {
    const scenario = determinePaymentScenario(expense);
    const paymentLines = expense.paymentLines || [];

    // Para pago completo, ignorar fecha_vencimiento
    const fechaVencimiento = scenario === 'FULL' ? null : expense.fecha_vencimiento;

    // 1. Insertar GASTO_V2
    const gastoResult = await client.query(queries.insertGasto, [
      expense.fecha,
      expense.monto_total,
      expense.moneda,
      expense.id_categoria,
      expense.id_subcategoria || null,
      fechaVencimiento,
      expense.num_comprobante || null,
      expense.detalle || null
    ]);

    const idGasto = gastoResult.rows[0].ID_GASTO;
    const creadoEn = gastoResult.rows[0].CREADO_EN;

    const createdTransactions = [];

    // 2. Insertar transacciones de pago (si hay)
    if (paymentLines.length > 0) {
      for (const line of paymentLines) {
        // Resolver cuenta
        const idCuenta = await this.resolveAccountId(client, line.metodo_pago, expense.moneda);

        // Insertar EG_TRANSACCIONES
        const egResult = await client.query(queries.insertEgTransaccion, [
          line.monto,
          expense.moneda,
          line.metodo_pago,
          idCuenta
        ]);

        const idEg = egResult.rows[0].ID_EG;
        const fechaEg = egResult.rows[0].FECHA_EG;

        // Insertar EG_DETALLE
        await client.query(queries.insertEgDetalle, [
          idEg,
          idGasto,
          line.monto
        ]);

        createdTransactions.push({
          id_eg: idEg,
          fecha_eg: fechaEg,
          monto: line.monto,
          metodo_pago: line.metodo_pago
        });
      }
    }

    return {
      id_gasto: idGasto,
      fecha_gasto: expense.fecha,
      monto_total: expense.monto_total,
      moneda: expense.moneda,
      id_categoria: expense.id_categoria,
      id_subcategoria_insumo: expense.id_subcategoria,
      fecha_vencimiento: fechaVencimiento,
      num_comprobante: expense.num_comprobante,
      detalle: expense.detalle,
      creado_en: creadoEn,
      scenario,
      transacciones: createdTransactions
    };
  }

  // ============================================
  // LEGACY METHODS (deprecated, mantener temporalmente)
  // ============================================

  async getAllGastosLegacy() {
    const result = await this.pool.query(queries.getAllLegacy);
    return result.rows;
  }

  /**
   * @deprecated Usar createExpensesBatch
   */
  async createGasto(gastoData) {
    console.warn('DEPRECATED: createGasto() - usar createExpensesBatch()');

    // Convertir formato legacy a V2
    const { convertLegacyMoneda, convertLegacyMetodoPago } = require('./gastos.validators');

    const moneda = convertLegacyMoneda(gastoData.moneda);
    if (!moneda) {
      throw new Error('Moneda inválida. Use UYU o USD');
    }

    const metodoPago = convertLegacyMetodoPago(gastoData.metodo_pago);

    // Construir payload V2
    const paymentLines = [];
    if (metodoPago && gastoData.monto > 0) {
      paymentLines.push({
        metodo_pago: metodoPago,
        monto: gastoData.monto
      });
    }

    const payload = {
      expenses: [{
        fecha: gastoData.fecha,
        monto_total: gastoData.monto,
        moneda,
        id_categoria: gastoData.id_categoria || 1, // Default si no viene
        id_subcategoria: null,
        fecha_vencimiento: paymentLines.length === 0 ? new Date().toISOString().split('T')[0] : null,
        num_comprobante: null,
        detalle: null,
        paymentLines
      }],
      idempotencyKey: `legacy-${Date.now()}-${Math.random()}`
    };

    const result = await this.createExpensesBatch(payload);
    return result.data[0];
  }

  /**
   * @deprecated No soportado en V2
   */
  async updateGasto(id, gastoData) {
    throw new Error('updateGasto no está soportado en V2. Los gastos no pueden modificarse después de creados.');
  }

  /**
   * @deprecated No soportado en V2
   */
  async deleteGasto(id) {
    throw new Error('deleteGasto no está soportado en V2. Use el módulo de cancelación.');
  }

  // ============================================
  // PAGO DE OBLIGACIONES
  // ============================================

  /**
   * Obtener gastos pendientes de pago
   */
  async getGastosPendientes() {
    const result = await this.pool.query(queries.getGastosPendientes);
    return result.rows;
  }

  /**
   * Obtener un gasto con su estado actual
   */
  async getGastoEstado(idGasto) {
    const result = await this.pool.query(queries.getGastoEstado, [idGasto]);
    if (result.rows.length === 0) {
      throw new Error('Gasto no encontrado');
    }
    return result.rows[0];
  }

  /**
   * Obtener historial de pagos de un gasto
   */
  async getHistorialPagosGasto(idGasto) {
    const result = await this.pool.query(queries.getHistorialPagosGasto, [idGasto]);
    return result.rows;
  }

  /**
   * Registrar pago de una obligación (gasto pendiente)
   * @param {Object} payload - { id_gasto, paymentLines: [{ metodo_pago, monto }] }
   */
  async registrarPagoObligacion(payload) {
    const { id_gasto, paymentLines } = payload;

    // Validaciones básicas
    if (!id_gasto) {
      throw new Error('id_gasto es requerido');
    }
    if (!Array.isArray(paymentLines) || paymentLines.length === 0) {
      throw new Error('Debe incluir al menos una línea de pago');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Obtener estado actual del gasto
      const gastoResult = await client.query(queries.getGastoEstado, [id_gasto]);
      if (gastoResult.rows.length === 0) {
        throw new Error('Gasto no encontrado');
      }

      const gasto = gastoResult.rows[0];

      // Validar que no esté ya pagado o cancelado
      if (gasto.ESTADO_CALCULADO === 'PAGADO') {
        throw new Error('Este gasto ya está completamente pagado');
      }

      const saldoPendiente = parseFloat(gasto.SALDO_PENDIENTE) || 0;
      const monedaGasto = gasto.MONEDA;

      // Calcular suma de pagos
      let sumaPagos = 0;
      for (const line of paymentLines) {
        if (!line.metodo_pago) {
          throw new Error('Cada línea de pago debe tener un método de pago');
        }
        if (!line.monto || line.monto <= 0) {
          throw new Error('Cada línea de pago debe tener un monto mayor a 0');
        }
        sumaPagos += parseFloat(line.monto);
      }

      // Validar que no exceda el saldo pendiente
      if (sumaPagos > saldoPendiente) {
        throw new Error(`El monto a pagar (${sumaPagos}) excede el saldo pendiente (${saldoPendiente})`);
      }

      const createdTransactions = [];

      // Insertar cada línea de pago
      for (const line of paymentLines) {
        // Resolver cuenta
        const idCuenta = await this.resolveAccountId(client, line.metodo_pago, monedaGasto);

        // Insertar EG_TRANSACCIONES
        const egResult = await client.query(queries.insertEgTransaccion, [
          line.monto,
          monedaGasto,
          line.metodo_pago,
          idCuenta
        ]);

        const idEg = egResult.rows[0].ID_EG;
        const fechaEg = egResult.rows[0].FECHA_EG;

        // Insertar EG_DETALLE
        await client.query(queries.insertEgDetalle, [
          idEg,
          id_gasto,
          line.monto
        ]);

        createdTransactions.push({
          id_eg: idEg,
          fecha_eg: fechaEg,
          monto: line.monto,
          metodo_pago: line.metodo_pago
        });
      }

      await client.query('COMMIT');

      // Obtener estado actualizado
      const gastoActualizado = await this.getGastoEstado(id_gasto);

      return {
        success: true,
        message: `Pago registrado exitosamente. Nuevo saldo: ${gastoActualizado.SALDO_PENDIENTE}`,
        data: {
          id_gasto,
          monto_pagado: sumaPagos,
          nuevo_saldo: gastoActualizado.SALDO_PENDIENTE,
          nuevo_estado: gastoActualizado.ESTADO_CALCULADO,
          transacciones: createdTransactions
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en registrarPagoObligacion:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // BONIFICACIONES SOBRE PAGOS
  // ============================================

  /**
   * Registrar bonificación sobre un pago específico
   * @param {Object} payload - { id_eg, monto_bonificacion }
   */
  async registrarBonificacionPago(payload) {
    const { id_eg, monto_bonificacion } = payload;

    // Validaciones básicas
    if (!id_eg) {
      throw new Error('id_eg es requerido');
    }
    if (!monto_bonificacion || monto_bonificacion <= 0) {
      throw new Error('monto_bonificacion debe ser mayor a 0');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Obtener datos del pago original
      const pagoResult = await client.query(queries.getPagoById, [id_eg]);
      if (pagoResult.rows.length === 0) {
        throw new Error('Pago no encontrado');
      }

      const pago = pagoResult.rows[0];

      // Validar que la bonificación no exceda el monto del pago
      if (parseFloat(monto_bonificacion) > parseFloat(pago.MONTO)) {
        throw new Error(`La bonificación (${monto_bonificacion}) no puede exceder el monto del pago (${pago.MONTO})`);
      }

      // Crear ingreso por bonificación
      const concepto = `Bonificación sobre pago EG #${id_eg}`;

      const ingResult = await client.query(queries.insertIngresoBonificacion, [
        monto_bonificacion,
        pago.ID_CUENTA,
        concepto
      ]);

      const idIng = ingResult.rows[0].ID_ING;
      const fechaIng = ingResult.rows[0].FECHA_ING;

      await client.query('COMMIT');

      return {
        success: true,
        message: `Bonificación de ${monto_bonificacion} registrada exitosamente en ${pago.NOMBRE_CUENTA}`,
        data: {
          id_ing: idIng,
          fecha_ing: fechaIng,
          monto: monto_bonificacion,
          cuenta_destino: pago.NOMBRE_CUENTA,
          pago_original: {
            id_eg: id_eg,
            monto_original: pago.MONTO,
            metodo_pago: pago.METODO_PAGO
          }
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en registrarBonificacionPago:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = GastosService;
