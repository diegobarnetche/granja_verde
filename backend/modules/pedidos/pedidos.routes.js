/**
 * pedidos.routes.js
 * Rutas para el módulo de pedidos V2 - Consolidado por Cliente
 */

const express = require('express');
const PedidosController = require('./pedidos.controller');

function createPedidosRouter(pool) {
  const router = express.Router();
  const controller = new PedidosController(pool);

  // ===== ESTADISTICAS =====
  // GET /api/pedidos/stats - Estadísticas de pedidos
  router.get('/stats', controller.getStats);

  // ===== CLIENTES CONSOLIDADOS =====
  // GET /api/pedidos/clientes - Lista clientes con pedidos pendientes
  router.get('/clientes', controller.getClientesConPedidos);

  // GET /api/pedidos/cliente/:id_cliente - Líneas de pedidos de un cliente
  router.get('/cliente/:id_cliente', controller.getLineasPorCliente);

  // ===== CAMBIO DE ESTADO DE LINEAS =====
  // PATCH /api/pedidos/lineas/estado - Marcar líneas como PREPARADAS
  router.patch('/lineas/estado', controller.actualizarEstadoLineas);

  // ===== OPERACIONES POR CLIENTE =====
  // PATCH /api/pedidos/cliente/:id_cliente/preparar-todo - Preparar todas las líneas
  router.patch('/cliente/:id_cliente/preparar-todo', controller.prepararTodoCliente);

  // PATCH /api/pedidos/cliente/:id_cliente/entregar - Entregar todos los pedidos
  router.patch('/cliente/:id_cliente/entregar', controller.entregarCliente);

  // ===== LEGACY (mantener compatibilidad) =====
  // GET /api/pedidos/:id_venta - Detalle de un pedido específico
  router.get('/:id_venta', controller.getPedidoById);

  return router;
}

module.exports = createPedidosRouter;
