/**
 * Controladores HTTP para Gastos V2
 */
const GastosService = require('./gastos.service');

class GastosController {
  constructor(pool) {
    this.service = new GastosService(pool);
  }

  // ============================================
  // CATÁLOGOS
  // ============================================

  /**
   * GET /api/gastos/categorias
   * Obtener todas las categorías de gasto
   */
  async getCategorias(req, res) {
    try {
      const categorias = await this.service.getCategorias();
      res.json(categorias);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/gastos/subcategorias?categoriaId=...
   * Obtener subcategorías filtradas por categoría
   */
  async getSubcategorias(req, res) {
    try {
      const { categoriaId } = req.query;
      if (!categoriaId) {
        return res.status(400).json({ error: 'categoriaId es requerido' });
      }
      const subcategorias = await this.service.getSubcategorias(categoriaId);
      res.json(subcategorias);
    } catch (error) {
      console.error('Error al obtener subcategorías:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // GASTOS
  // ============================================

  /**
   * GET /api/gastos
   * Obtener todos los gastos V2
   */
  async getAll(req, res) {
    try {
      const gastos = await this.service.getAllGastos();
      res.json(gastos);
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/gastos/:id
   * Obtener un gasto por ID con sus transacciones
   */
  async getById(req, res) {
    try {
      const gasto = await this.service.getGastoById(req.params.id);
      res.json(gasto);
    } catch (error) {
      if (error.message === 'Gasto no encontrado') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error al obtener gasto:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * POST /api/gastos
   * Crear gastos en batch (V2)
   *
   * Body esperado:
   * {
   *   expenses: [{
   *     fecha, monto_total, moneda, id_categoria, id_subcategoria?,
   *     fecha_vencimiento?, num_comprobante?, detalle?,
   *     paymentLines: [{ metodo_pago, monto }]
   *   }],
   *   idempotencyKey: "uuid"
   * }
   */
  async create(req, res) {
    try {
      const result = await this.service.createExpensesBatch(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error.validationErrors) {
        res.status(400).json({
          error: 'Validación fallida',
          details: error.validationErrors
        });
      } else if (error.message.includes('Cuenta no encontrada')) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error al crear gastos:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * PUT /api/gastos/:id
   * @deprecated No soportado en V2
   */
  async update(req, res) {
    res.status(405).json({
      error: 'Método no permitido',
      message: 'La edición de gastos no está soportada en V2. Los gastos son inmutables después de creados.'
    });
  }

  /**
   * DELETE /api/gastos/:id
   * @deprecated No soportado en V2
   */
  async delete(req, res) {
    res.status(405).json({
      error: 'Método no permitido',
      message: 'La eliminación de gastos no está soportada en V2. Use el módulo de cancelación.'
    });
  }

  // ============================================
  // PAGO DE OBLIGACIONES
  // ============================================

  /**
   * GET /api/gastos/obligaciones/pendientes
   * Obtener gastos pendientes de pago
   */
  async getGastosPendientes(req, res) {
    try {
      const gastos = await this.service.getGastosPendientes();
      res.json(gastos);
    } catch (error) {
      console.error('Error al obtener gastos pendientes:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/gastos/obligaciones/:id
   * Obtener un gasto con su estado actual
   */
  async getGastoEstado(req, res) {
    try {
      const gasto = await this.service.getGastoEstado(req.params.id);
      res.json(gasto);
    } catch (error) {
      if (error.message === 'Gasto no encontrado') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error al obtener gasto:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * GET /api/gastos/obligaciones/:id/historial
   * Obtener historial de pagos de un gasto
   */
  async getHistorialPagosGasto(req, res) {
    try {
      const historial = await this.service.getHistorialPagosGasto(req.params.id);
      res.json(historial);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/gastos/obligaciones/pagar
   * Registrar pago de una obligación
   * Body: { id_gasto, paymentLines: [{ metodo_pago, monto }] }
   */
  async registrarPagoObligacion(req, res) {
    try {
      const result = await this.service.registrarPagoObligacion(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error.message.includes('excede') ||
          error.message.includes('requerido') ||
          error.message.includes('ya está') ||
          error.message.includes('Debe incluir')) {
        res.status(400).json({ error: error.message });
      } else if (error.message === 'Gasto no encontrado') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Cuenta no encontrada')) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error al registrar pago:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  // ============================================
  // BONIFICACIONES SOBRE PAGOS
  // ============================================

  /**
   * POST /api/gastos/pagos/:id_eg/bonificacion
   * Registrar bonificación sobre un pago específico
   * Body: { monto_bonificacion }
   */
  async registrarBonificacionPago(req, res) {
    try {
      const payload = {
        id_eg: req.params.id_eg,
        monto_bonificacion: req.body.monto_bonificacion
      };

      const result = await this.service.registrarBonificacionPago(payload);
      res.status(201).json(result);
    } catch (error) {
      if (error.message.includes('requerido') ||
          error.message.includes('debe ser mayor') ||
          error.message.includes('no puede exceder')) {
        res.status(400).json({ error: error.message });
      } else if (error.message === 'Pago no encontrado') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error al registrar bonificación:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }
}

module.exports = GastosController;
