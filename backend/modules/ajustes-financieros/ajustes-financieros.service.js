/**
 * Capa de lógica de negocio para Ajustes Financieros
 * Maneja transacciones atómicas para AF_TRANSACCIONES y AF_DETALLE
 */
const queries = require('./ajustes-financieros.sql');
const { validateCreateAjuste, validateDimension } = require('./ajustes-financieros.validators');

class AjustesFinancierosService {
  constructor(pool) {
    this.pool = pool;
  }

  // ============================================
  // DIMENSIONES (Tipos de Ajuste)
  // ============================================

  async getDimensionesActivas() {
    const result = await this.pool.query(queries.getDimensionesActivas);
    return result.rows;
  }

  async getDimensionById(id) {
    const result = await this.pool.query(queries.getDimensionById, [id]);
    if (result.rows.length === 0) {
      throw new Error('Dimensión no encontrada');
    }
    return result.rows[0];
  }

  async createDimension(payload) {
    const validation = validateDimension(payload);
    if (!validation.valid) {
      const error = new Error('Validación fallida');
      error.validationErrors = validation.errors;
      throw error;
    }

    const result = await this.pool.query(queries.createDimension, [
      payload.codigo.toUpperCase(),
      payload.descripcion,
      payload.naturaleza
    ]);

    return result.rows[0];
  }

  async updateDimension(id, payload) {
    const validation = validateDimension(payload);
    if (!validation.valid) {
      const error = new Error('Validación fallida');
      error.validationErrors = validation.errors;
      throw error;
    }

    const activo = payload.activo !== undefined ? payload.activo : true;

    const result = await this.pool.query(queries.updateDimension, [
      id,
      payload.codigo.toUpperCase(),
      payload.descripcion,
      payload.naturaleza,
      activo
    ]);

    if (result.rows.length === 0) {
      throw new Error('Dimensión no encontrada');
    }

    return result.rows[0];
  }

  // ============================================
  // AJUSTES FINANCIEROS
  // ============================================

  /**
   * Listar ajustes con filtros opcionales
   */
  async getAll(filters = {}) {
    const {
      idTipoAjuste = null,
      fechaDesde = null,
      fechaHasta = null,
      estado = null,
      moneda = null
    } = filters;

    const result = await this.pool.query(queries.getAll, [
      idTipoAjuste,
      fechaDesde,
      fechaHasta,
      estado,
      moneda
    ]);

    return result.rows;
  }

  /**
   * Obtener un ajuste por ID con su detalle
   */
  async getById(id) {
    const ajusteResult = await this.pool.query(queries.getById, [id]);
    if (ajusteResult.rows.length === 0) {
      throw new Error('Ajuste financiero no encontrado');
    }

    const ajuste = ajusteResult.rows[0];

    // Obtener detalle
    const detalleResult = await this.pool.query(queries.getDetalleByAjuste, [id]);
    ajuste.detalle = detalleResult.rows;

    return ajuste;
  }

  /**
   * Crear un ajuste financiero con su detalle
   * Usa transacción atómica
   */
  async createAjuste(payload) {
    // Validar payload
    const validation = validateCreateAjuste(payload);
    if (!validation.valid) {
      const error = new Error('Validación fallida');
      error.validationErrors = validation.errors;
      throw error;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validar que el tipo de ajuste existe y está activo
      const tipoResult = await client.query(queries.getDimensionById, [payload.idTipoAjuste]);
      if (tipoResult.rows.length === 0) {
        throw new Error('Tipo de ajuste no encontrado');
      }
      if (!tipoResult.rows[0].ACTIVO) {
        throw new Error('Tipo de ajuste no está activo');
      }

      // Validar cuenta (si se envía)
      if (payload.idCuenta) {
        const cuentaResult = await client.query(queries.getCuentaById, [payload.idCuenta]);
        if (cuentaResult.rows.length === 0) {
          throw new Error('Cuenta no encontrada');
        }
        if (!cuentaResult.rows[0].ACTIVA) {
          throw new Error('Cuenta no está activa');
        }
        // Validar que la moneda de la cuenta coincide con la del ajuste
        if (cuentaResult.rows[0].MONEDA !== payload.moneda) {
          throw new Error(
            `La moneda de la cuenta (${cuentaResult.rows[0].MONEDA}) no coincide con la del ajuste (${payload.moneda})`
          );
        }
      }

      // Validar que los gastos/ventas referenciados existen
      for (const det of payload.detalle) {
        if (det.idGasto) {
          const gastoResult = await client.query(queries.getGastoById, [det.idGasto]);
          if (gastoResult.rows.length === 0) {
            throw new Error(`Gasto ${det.idGasto} no encontrado`);
          }
          if (gastoResult.rows[0].CANCELADO) {
            throw new Error(`Gasto ${det.idGasto} está cancelado`);
          }
        }

        if (det.idVenta) {
          const ventaResult = await client.query(queries.getVentaById, [det.idVenta]);
          if (ventaResult.rows.length === 0) {
            throw new Error(`Venta ${det.idVenta} no encontrada`);
          }
          if (ventaResult.rows[0].ESTADO === 'CANCELADO') {
            throw new Error(`Venta ${det.idVenta} está cancelada`);
          }
        }
      }

      // Insertar transacción principal
      const fecha = payload.fecha || new Date().toISOString();
      const transResult = await client.query(queries.createTransaccion, [
        fecha,
        payload.idTipoAjuste,
        payload.monto,
        payload.moneda,
        payload.idCuenta || null,
        payload.referencia || null,
        payload.nota || null
      ]);

      const idAf = transResult.rows[0].ID_AF;

      // Insertar detalle
      const detalles = [];
      for (const det of payload.detalle) {
        const detResult = await client.query(queries.createDetalle, [
          idAf,
          det.idGasto || null,
          det.idVenta || null,
          det.montoAplicado,
          det.porcentaje || null,
          det.baseCalculo || null
        ]);
        detalles.push(detResult.rows[0]);
      }

      await client.query('COMMIT');

      // Retornar el ajuste completo
      return {
        id_af: idAf,
        fecha_af: fecha,
        id_tipo_ajuste: payload.idTipoAjuste,
        monto: payload.monto,
        moneda: payload.moneda,
        id_cuenta: payload.idCuenta || null,
        referencia: payload.referencia || null,
        nota: payload.nota || null,
        estado: 'ACTIVO',
        detalle: detalles
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Anular un ajuste financiero
   * Solo cambia el estado, no elimina registros
   */
  async anularAjuste(id) {
    const result = await this.pool.query(queries.anularAjuste, [id]);

    if (result.rows.length === 0) {
      // Verificar si existe
      const checkResult = await this.pool.query(queries.getById, [id]);
      if (checkResult.rows.length === 0) {
        throw new Error('Ajuste financiero no encontrado');
      }
      // Si existe pero no se pudo anular, es porque ya está anulado
      throw new Error('El ajuste ya está anulado');
    }

    return result.rows[0];
  }
}

module.exports = AjustesFinancierosService;
