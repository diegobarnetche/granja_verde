/**
 * cobros.routes.js
 * Rutas para el módulo de cobros
 */

const express = require('express');
const CobrosController = require('./cobros.controller');

function createCobrosRouter(pool) {
  const router = express.Router();
  const controller = new CobrosController(pool);

  // GET /api/cobros/pending-clients - Clientes con deuda pendiente
  router.get('/pending-clients', controller.getPendingClients);

  // GET /api/cobros/client/:id_cliente/ventas - Ventas pendientes de un cliente
  router.get('/client/:id_cliente/ventas', controller.getVentasPendientes);

  // GET /api/cobros/client/:id_cliente/historial - Historial de pagos de un cliente
  router.get('/client/:id_cliente/historial', controller.getHistorialPagos);

  // POST /api/cobros/register-payment - Registrar pago
  router.post('/register-payment', controller.registerPayment);

  return router;
}

module.exports = createCobrosRouter;
