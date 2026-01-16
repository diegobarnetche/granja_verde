/**
 * Capa de lógica de negocio para Gastos
 */
const queries = require('./gastos.sql');

class GastosService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Obtener todos los gastos
   */
  async getAllGastos() {
    try {
      const result = await this.pool.query(queries.getAll);
      return result.rows;
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo gasto
   */
  async createGasto(gastoData) {
    const { fecha, monto, moneda, metodo_pago, categoria, estado } = gastoData;

    // Validación
    if (!fecha || !monto || !moneda || !metodo_pago || !categoria) {
      throw new Error('Fecha, monto, moneda, método de pago y categoría son requeridos');
    }

    try {
      const result = await this.pool.query(queries.create, [
        fecha,
        monto,
        moneda,
        metodo_pago,
        categoria,
        estado || 'PENDIENTE'
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error al crear gasto:', error);
      throw error;
    }
  }

  /**
   * Actualizar un gasto existente
   */
  async updateGasto(id, gastoData) {
    const { fecha, monto, moneda, metodo_pago, categoria, estado } = gastoData;

    try {
      const result = await this.pool.query(queries.update, [
        fecha,
        monto,
        moneda,
        metodo_pago,
        categoria,
        estado,
        id
      ]);

      if (result.rows.length === 0) {
        throw new Error('Gasto no encontrado');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error al actualizar gasto:', error);
      throw error;
    }
  }

  /**
   * Eliminar un gasto
   */
  async deleteGasto(id) {
    try {
      const result = await this.pool.query(queries.delete, [id]);

      if (result.rows.length === 0) {
        throw new Error('Gasto no encontrado');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      throw error;
    }
  }
}

module.exports = GastosService;
