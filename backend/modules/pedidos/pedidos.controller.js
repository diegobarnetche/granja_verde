/**
 * pedidos.controller.js
 * Controladores para los endpoints de pedidos V2 - Consolidado por Cliente
 */

const PedidosService = require('./pedidos.service');
const { validarBigInt, validarArrayIds, ESTADOS_LINEA } = require('./pedidos.validators');

class PedidosController {
  constructor(pool) {
    this.service = new PedidosService(pool);
  }

  // ===== CLIENTES CONSOLIDADOS =====

  /**
   * GET /api/pedidos/clientes
   * Lista de clientes con pedidos pendientes/preparados
   */
  getClientesConPedidos = async (req, res) => {
    try {
      const filters = {
        cliente: req.query.cliente || null,
      };

      const clientes = await this.service.getClientesConPedidos(filters);

      res.json({
        status: 'OK',
        count: clientes.length,
        data: clientes,
      });
    } catch (error) {
      console.error('Error al obtener clientes con pedidos:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/pedidos/cliente/:id_cliente
   * Todas las líneas de pedidos de un cliente
   */
  getLineasPorCliente = async (req, res) => {
    try {
      const idCliente = validarBigInt(req.params.id_cliente, 'id_cliente');
      const data = await this.service.getLineasPorCliente(idCliente);

      res.json({
        status: 'OK',
        id_cliente: idCliente,
        total_lineas: data.lineas.length,
        total_pedidos: data.pedidos.length,
        data: data,
      });
    } catch (error) {
      console.error('Error al obtener líneas del cliente:', error);
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  };

  // ===== CAMBIO DE ESTADO DE LINEAS =====

  /**
   * PATCH /api/pedidos/lineas/estado
   * Marcar líneas como PREPARADAS o PENDIENTE
   * Body: { ids: [1, 2, 3], estado: 'PREPARADO' }
   */
  actualizarEstadoLineas = async (req, res) => {
    try {
      const { ids, estado = 'PREPARADO' } = req.body;

      // Validar array de IDs
      const idsValidados = validarArrayIds(ids, 'ids');

      // Validar estado
      if (!ESTADOS_LINEA.includes(estado)) {
        return res.status(400).json({
          status: 'ERROR',
          error: `Estado debe ser uno de: ${ESTADOS_LINEA.join(', ')}`,
        });
      }

      const resultado = await this.service.actualizarEstadoLineas(idsValidados, estado);

      res.json({
        status: 'OK',
        message: `${resultado.lineas_actualizadas} líneas actualizadas a ${estado}`,
        data: resultado,
      });
    } catch (error) {
      console.error('Error al actualizar estado de líneas:', error);
      const status = error.statusCode || 500;
      res.status(status).json({
        status: 'ERROR',
        error: error.message,
        errors: error.errors || [],
      });
    }
  };

  // ===== OPERACIONES POR CLIENTE =====

  /**
   * PATCH /api/pedidos/cliente/:id_cliente/preparar-todo
   * Marcar TODAS las líneas de un cliente como PREPARADAS
   */
  prepararTodoCliente = async (req, res) => {
    try {
      const idCliente = validarBigInt(req.params.id_cliente, 'id_cliente');
      const resultado = await this.service.prepararTodoCliente(idCliente);

      res.json({
        status: 'OK',
        message: `${resultado.lineas_preparadas} líneas y ${resultado.pedidos_preparados} pedidos marcados como PREPARADOS`,
        data: resultado,
      });
    } catch (error) {
      console.error('Error al preparar todo el cliente:', error);
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  };

  /**
   * PATCH /api/pedidos/cliente/:id_cliente/entregar
   * Marcar todos los pedidos del cliente como ENTREGADOS
   */
  entregarCliente = async (req, res) => {
    try {
      const idCliente = validarBigInt(req.params.id_cliente, 'id_cliente');
      const resultado = await this.service.entregarCliente(idCliente);

      res.json({
        status: 'OK',
        message: `${resultado.pedidos_entregados} pedidos marcados como ENTREGADOS`,
        data: resultado,
      });
    } catch (error) {
      console.error('Error al entregar pedidos del cliente:', error);
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  };

  // ===== ESTADISTICAS =====

  /**
   * GET /api/pedidos/stats
   * Estadísticas de pedidos
   */
  getStats = async (req, res) => {
    try {
      const stats = await this.service.getStats();

      res.json({
        status: 'OK',
        data: stats,
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: error.message });
    }
  };

  // ===== LEGACY =====

  /**
   * GET /api/pedidos/:id_venta
   * Detalle de un pedido específico (legacy)
   */
  getPedidoById = async (req, res) => {
    try {
      const idVenta = validarBigInt(req.params.id_venta, 'id_venta');
      const pedido = await this.service.getPedidoById(idVenta);

      res.json({
        status: 'OK',
        data: pedido,
      });
    } catch (error) {
      console.error('Error al obtener pedido:', error);
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  };
}

module.exports = PedidosController;
