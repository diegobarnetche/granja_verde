/**
 * Rutas para el módulo de Gastos
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

  // Bind del contexto para que 'this' funcione correctamente en los métodos
  router.get('/', controller.getAll.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.put('/:id', controller.update.bind(controller));
  router.delete('/:id', controller.delete.bind(controller));

  return router;
}

module.exports = createGastosRouter;
