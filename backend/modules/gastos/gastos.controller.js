/**
 * Controladores HTTP para Gastos
 */
const GastosService = require('./gastos.service');

class GastosController {
  constructor(pool) {
    this.service = new GastosService(pool);
  }

  /**
   * GET /api/gastos
   * Obtener todos los gastos
   */
  async getAll(req, res) {
    try {
      const gastos = await this.service.getAllGastos();
      res.json(gastos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/gastos
   * Crear un nuevo gasto
   */
  async create(req, res) {
    try {
      const gasto = await this.service.createGasto(req.body);
      res.json(gasto);
    } catch (error) {
      if (error.message.includes('requeridos')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * PUT /api/gastos/:id
   * Actualizar un gasto existente
   */
  async update(req, res) {
    try {
      const gasto = await this.service.updateGasto(req.params.id, req.body);
      res.json(gasto);
    } catch (error) {
      if (error.message === 'Gasto no encontrado') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * DELETE /api/gastos/:id
   * Eliminar un gasto
   */
  async delete(req, res) {
    try {
      const gasto = await this.service.deleteGasto(req.params.id);
      res.json({ message: 'Gasto eliminado', gasto });
    } catch (error) {
      if (error.message === 'Gasto no encontrado') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
}

module.exports = GastosController;
