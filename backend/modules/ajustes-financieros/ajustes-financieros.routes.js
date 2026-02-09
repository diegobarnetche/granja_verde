/**
 * Rutas para el módulo de Ajustes Financieros
 */
const express = require('express');
const AjustesFinancierosController = require('./ajustes-financieros.controller');

/**
 * Factory function que retorna el router configurado
 * @param {Pool} pool - Pool de conexiones de PostgreSQL
 * @returns {Router} Express router
 */
function createAjustesFinancierosRouter(pool) {
  const router = express.Router();
  const controller = new AjustesFinancierosController(pool);

  // ============================================
  // DIMENSIONES (deben ir antes de rutas con :id)
  // ============================================
  router.get('/dimensiones', controller.getDimensiones.bind(controller));
  router.post('/dimensiones', controller.createDimension.bind(controller));
  router.put('/dimensiones/:id', controller.updateDimension.bind(controller));

  // ============================================
  // AJUSTES FINANCIEROS CRUD
  // ============================================
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.put('/:id/anular', controller.anular.bind(controller));

  return router;
}

module.exports = createAjustesFinancierosRouter;
