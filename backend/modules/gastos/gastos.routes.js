/**
 * Rutas para el módulo de Gastos V2
 */
const express = require('express');
const GastosController = require('./gastos.controller');

/**
 * Factory function que retorna el router configurado
 * @param {Pool} pool - Pool de conexiones de PostgreSQL
 * @returns {Router} Express router
 */
function createGastosRouter(pool) {
  const router = express.Router();
  const controller = new GastosController(pool);

  // ============================================
  // CATÁLOGOS (deben ir antes de rutas con :id)
  // ============================================
  router.get('/categorias', controller.getCategorias.bind(controller));
  router.get('/subcategorias', controller.getSubcategorias.bind(controller));

  // ============================================
  // PAGO DE OBLIGACIONES (deben ir antes de rutas con :id genérico)
  // ============================================
  router.get('/obligaciones/pendientes', controller.getGastosPendientes.bind(controller));
  router.get('/obligaciones/:id', controller.getGastoEstado.bind(controller));
  router.get('/obligaciones/:id/historial', controller.getHistorialPagosGasto.bind(controller));
  router.post('/obligaciones/pagar', controller.registrarPagoObligacion.bind(controller));

  // ============================================
  // BONIFICACIONES SOBRE PAGOS
  // ============================================
  router.post('/pagos/:id_eg/bonificacion', controller.registrarBonificacionPago.bind(controller));

  // ============================================
  // GASTOS CRUD
  // ============================================
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));

  // Deprecated en V2 (devuelven 405)
  router.put('/:id', controller.update.bind(controller));
  router.delete('/:id', controller.delete.bind(controller));

  return router;
}

module.exports = createGastosRouter;
