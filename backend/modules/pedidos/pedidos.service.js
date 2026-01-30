/**
 * pedidos.service.js
 * Lógica de negocio para el módulo de pedidos V2 - Consolidado por Cliente
 * Tablas: VENTAS, DETALLE_VENTAS, CLIENTE, PRODUCTO
 */

const SQL = require('./pedidos.sql');

class PedidosService {
  constructor(pool) {
    this.pool = pool;
  }

  // ===== CLIENTES CONSOLIDADOS =====

  /**
   * Obtiene lista de clientes con pedidos pendientes/preparados
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>}
   */
  async getClientesConPedidos(filters = {}) {
    const { cliente = null } = filters;
    const clienteSearch = cliente ? `%${cliente}%` : null;

    const result = await this.pool.query(SQL.getClientesConPedidos, [clienteSearch]);
    return result.rows;
  }

  /**
   * Obtiene todas las líneas de pedidos de un cliente
   * @param {number} idCliente
   * @returns {Promise<Object>}
   */
  async getLineasPorCliente(idCliente) {
    const [lineasResult, resumenResult] = await Promise.all([
      this.pool.query(SQL.getLineasPorCliente, [idCliente]),
      this.pool.query(SQL.getResumenPedidosCliente, [idCliente]),
    ]);

    return {
      lineas: lineasResult.rows,
      pedidos: resumenResult.rows,
    };
  }

  // ===== CAMBIO DE ESTADO DE LINEAS =====

  /**
   * Marca líneas específicas como PREPARADAS
   * Luego verifica si los pedidos afectados deben cambiar de estado
   * @param {Array<number>} idsLineas - IDs de las líneas a actualizar
   * @param {string} nuevoEstado - 'PREPARADO' o 'PENDIENTE'
   * @returns {Promise<Object>}
   */
  async actualizarEstadoLineas(idsLineas, nuevoEstado = 'PREPARADO') {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Actualizar el estado de las líneas
      const updateResult = await client.query(SQL.updateEstadoLineas, [idsLineas, nuevoEstado]);
      const lineasActualizadas = updateResult.rows;

      // 2. Obtener los pedidos (ventas) afectados
      const ventasAfectadas = [...new Set(lineasActualizadas.map(l => l.ID_VENTA))];

      // 3. Para cada pedido, verificar si todas sus líneas están PREPARADAS
      const pedidosActualizados = [];

      for (const idVenta of ventasAfectadas) {
        const checkResult = await client.query(SQL.checkPedidoCompleto, [idVenta]);
        const pedido = checkResult.rows[0];

        if (pedido) {
          const todasPreparadas = parseInt(pedido.LINEAS_PREPARADAS) === parseInt(pedido.TOTAL_LINEAS);

          // Si todas las líneas están preparadas, cambiar estado del pedido a PREPARADO
          if (todasPreparadas) {
            await client.query(SQL.updateEstadoPedido, [idVenta, 'PREPARADO']);
            pedidosActualizados.push({ ID_VENTA: idVenta, ESTADO_PREP: 'PREPARADO', auto: true });
          } else {
            // Si no todas están preparadas, asegurar que el pedido esté en PENDIENTE
            await client.query(SQL.updateEstadoPedido, [idVenta, 'PENDIENTE']);
            pedidosActualizados.push({ ID_VENTA: idVenta, ESTADO_PREP: 'PENDIENTE', auto: true });
          }
        }
      }

      await client.query('COMMIT');

      return {
        lineas_actualizadas: lineasActualizadas.length,
        pedidos_afectados: pedidosActualizados,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== OPERACIONES POR CLIENTE =====

  /**
   * Marca TODAS las líneas de un cliente como PREPARADAS
   * y actualiza los pedidos a PREPARADO
   * @param {number} idCliente
   * @returns {Promise<Object>}
   */
  async prepararTodoCliente(idCliente) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Marcar todas las líneas como PREPARADAS
      const lineasResult = await client.query(SQL.prepararTodasLineasCliente, [idCliente]);

      // 2. Marcar todos los pedidos como PREPARADOS
      const pedidosResult = await client.query(SQL.prepararPedidosCliente, [idCliente]);

      await client.query('COMMIT');

      return {
        lineas_preparadas: lineasResult.rowCount,
        pedidos_preparados: pedidosResult.rowCount,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Marca todos los pedidos de un cliente como ENTREGADOS
   * @param {number} idCliente
   * @returns {Promise<Object>}
   */
  async entregarCliente(idCliente) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Primero preparar todas las líneas pendientes
      await client.query(SQL.prepararTodasLineasCliente, [idCliente]);

      // 2. Marcar todos los pedidos como ENTREGADOS
      const result = await client.query(SQL.entregarPedidosCliente, [idCliente]);

      await client.query('COMMIT');

      return {
        pedidos_entregados: result.rowCount,
        ids_pedidos: result.rows.map(r => r.ID_VENTA),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== ESTADISTICAS =====

  /**
   * Obtiene estadísticas de pedidos
   * @returns {Promise<Object>}
   */
  async getStats() {
    const result = await this.pool.query(SQL.getStats);
    const row = result.rows[0];
    return {
      pedidos_pendientes: parseInt(row.pedidos_pendientes) || 0,
      pedidos_preparados: parseInt(row.pedidos_preparados) || 0,
      entregados_hoy: parseInt(row.entregados_hoy) || 0,
      clientes_con_pedidos: parseInt(row.clientes_con_pedidos) || 0,
    };
  }

  // ===== LEGACY (mantener compatibilidad) =====

  /**
   * Obtiene un pedido por ID con su detalle
   * @param {number} idVenta
   * @returns {Promise<Object>}
   */
  async getPedidoById(idVenta) {
    const pedidoResult = await this.pool.query(SQL.getPedidoById, [idVenta]);

    if (pedidoResult.rows.length === 0) {
      const error = new Error('Pedido no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const pedido = pedidoResult.rows[0];
    const detalleResult = await this.pool.query(SQL.getDetallePedido, [idVenta]);
    pedido.DETALLE = detalleResult.rows;

    return pedido;
  }
}

module.exports = PedidosService;
