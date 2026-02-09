/**
 * Controladores HTTP para Ajustes Financieros
 */
const AjustesFinancierosService = require('./ajustes-financieros.service');

class AjustesFinancierosController {
  constructor(pool) {
    this.service = new AjustesFinancierosService(pool);
  }

  // ============================================
  // DIMENSIONES (Tipos de Ajuste)
  // ============================================

  /**
   * GET /api/ajustes-financieros/dimensiones
   * Listar tipos de ajuste activos
   */
  async getDimensiones(req, res) {
    try {
      const dimensiones = await this.service.getDimensionesActivas();
      res.json(dimensiones);
    } catch (error) {
      console.error('Error al obtener dimensiones:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/ajustes-financieros/dimensiones
   * Crear nuevo tipo de ajuste
   */
  async createDimension(req, res) {
    try {
      const dimension = await this.service.createDimension(req.body);
      res.status(201).json(dimension);
    } catch (error) {
      if (error.validationErrors) {
        res.status(400).json({
          error: 'Validación fallida',
          details: error.validationErrors
        });
      } else if (error.message.includes('duplicate key')) {
        res.status(400).json({ error: 'Ya existe una dimensión con ese código' });
      } else {
        console.error('Error al crear dimensión:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * PUT /api/ajustes-financieros/dimensiones/:id
   * Editar tipo de ajuste
   */
  async updateDimension(req, res) {
    try {
      const dimension = await this.service.updateDimension(req.params.id, req.body);
      res.json(dimension);
    } catch (error) {
      if (error.validationErrors) {
        res.status(400).json({
          error: 'Validación fallida',
          details: error.validationErrors
        });
      } else if (error.message === 'Dimensión no encontrada') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('duplicate key')) {
        res.status(400).json({ error: 'Ya existe una dimensión con ese código' });
      } else {
        console.error('Error al actualizar dimensión:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  // ============================================
  // AJUSTES FINANCIEROS
  // ============================================

  /**
   * GET /api/ajustes-financieros
   * Listar ajustes con filtros opcionales
   * Query params: idTipoAjuste, fechaDesde, fechaHasta, estado, moneda
   */
  async getAll(req, res) {
    try {
      const filters = {
        idTipoAjuste: req.query.idTipoAjuste || null,
        fechaDesde: req.query.fechaDesde || null,
        fechaHasta: req.query.fechaHasta || null,
        estado: req.query.estado || null,
        moneda: req.query.moneda || null
      };

      const ajustes = await this.service.getAll(filters);
      res.json(ajustes);
    } catch (error) {
      console.error('Error al obtener ajustes:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/ajustes-financieros/:id
   * Obtener un ajuste con su detalle
   */
  async getById(req, res) {
    try {
      const ajuste = await this.service.getById(req.params.id);
      res.json(ajuste);
    } catch (error) {
      if (error.message === 'Ajuste financiero no encontrado') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error al obtener ajuste:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * POST /api/ajustes-financieros
   * Crear ajuste financiero con detalle
   *
   * Body esperado:
   * {
   *   fecha: "2026-02-08T00:00:00Z",
   *   idTipoAjuste: 2,
   *   monto: 1750.00,
   *   moneda: "UYU",
   *   idCuenta: 1,
   *   referencia: "POS-2026-02-08",
   *   nota: "Comisión POS febrero",
   *   detalle: [
   *     {
   *       idVenta: 1001,
   *       montoAplicado: 1750.00,
   *       porcentaje: 3.50,
   *       baseCalculo: 50000.00
   *     }
   *   ]
   * }
   */
  async create(req, res) {
    try {
      const ajuste = await this.service.createAjuste(req.body);
      res.status(201).json(ajuste);
    } catch (error) {
      if (error.validationErrors) {
        res.status(400).json({
          error: 'Validación fallida',
          details: error.validationErrors
        });
      } else if (
        error.message.includes('no encontrad') ||
        error.message.includes('no está activ') ||
        error.message.includes('cancelad') ||
        error.message.includes('no coincide')
      ) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error al crear ajuste:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * PUT /api/ajustes-financieros/:id/anular
   * Anular un ajuste (cambiar estado a ANULADO)
   */
  async anular(req, res) {
    try {
      const ajuste = await this.service.anularAjuste(req.params.id);
      res.json(ajuste);
    } catch (error) {
      if (
        error.message === 'Ajuste financiero no encontrado' ||
        error.message === 'El ajuste ya está anulado'
      ) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error al anular ajuste:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }
}

module.exports = AjustesFinancierosController;
