/**
 * cobros.controller.js
 * Controladores para los endpoints de cobros
 */

const CobrosService = require('./cobros.service');
const { validarRegistrarPago, validarBigInt, METODOS_PAGO, MODOS_PAGO } = require('./cobros.validators');

class CobrosController {
  constructor(pool) {
    this.service = new CobrosService(pool);
  }

  /**
   * GET /api/cobros/pending-clients
   * Lista de clientes con saldo pendiente > 0
   */
  getPendingClients = async (req, res) => {
    try {
      const clientes = await this.service.getClientesConDeuda();

      res.json({
        status: 'OK',
        count: clientes.length,
        data: clientes,
        enums: {
          METODOS_PAGO,
          MODOS_PAGO,
        },
      });
    } catch (error) {
      console.error('Error al obtener clientes con deuda:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/cobros/client/:id_cliente/ventas
   * Ventas pendientes de un cliente específico
   */
  getVentasPendientes = async (req, res) => {
    try {
      const idCliente = validarBigInt(req.params.id_cliente, 'id_cliente');
      const [ventas, deudaTotal] = await Promise.all([
        this.service.getVentasPendientes(idCliente),
        this.service.getDeudaCliente(idCliente),
      ]);

      res.json({
        status: 'OK',
        id_cliente: idCliente,
        deuda_total: deudaTotal,
        ventas_pendientes: ventas.length,
        data: ventas,
      });
    } catch (error) {
      console.error('Error al obtener ventas pendientes:', error);

      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  };

  /**
   * POST /api/cobros/register-payment
   * Registra un pago para un cliente
   * Body: { ID_CLIENTE, MODE: 'FULL'|'PARTIAL', PAYMENT_LINES: [{monto, metodo_pago, referencia?, nota?}] }
   */
  registerPayment = async (req, res) => {
    try {
      // Validar datos de entrada
      const dataValidada = validarRegistrarPago(req.body);

      // Registrar pago
      const result = await this.service.registrarPago(dataValidada);

      res.status(201).json(result);
    } catch (error) {
      console.error('Error al registrar pago:', error);

      if (error.statusCode === 400) {
        return res.status(400).json({
          status: 'ERROR',
          error: error.message,
          errors: error.errors || [],
        });
      }

      res.status(500).json({
        status: 'ERROR',
        error: error.message,
      });
    }
  };

  /**
   * GET /api/cobros/client/:id_cliente/historial
   * Historial de pagos de un cliente
   */
  getHistorialPagos = async (req, res) => {
    try {
      const idCliente = validarBigInt(req.params.id_cliente, 'id_cliente');
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;

      const historial = await this.service.getHistorialPagos(idCliente, limit, offset);

      res.json({
        status: 'OK',
        id_cliente: idCliente,
        count: historial.length,
        data: historial,
      });
    } catch (error) {
      console.error('Error al obtener historial de pagos:', error);

      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = CobrosController;
