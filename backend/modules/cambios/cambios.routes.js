/**
 * Rutas para el módulo de Cambios de Moneda
 */
const express = require('express');
const CambiosController = require('./cambios.controller');

/**
 * Factory function que retorna el router configurado
 * @param {Pool} pool - Pool de conexiones de PostgreSQL
 * @returns {Router} Express router
 */
function createCambiosRouter(pool) {
  const router = express.Router();
  const controller = new CambiosController(pool);

  // ============================================
  // CUENTAS Y SALDOS
  // ============================================
  router.get('/cuentas', controller.getCuentasConSaldo.bind(controller));
  router.get('/cuentas/:id/saldo', controller.getSaldoCuenta.bind(controller));

  // ============================================
  // CAMBIOS
  // ============================================
  router.get('/', controller.getHistorial.bind(controller));
  router.post('/', controller.registrarCambio.bind(controller));

  return router;
}

module.exports = createCambiosRouter;
