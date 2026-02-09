/**
 * Rutas para el módulo de Clientes
 */
const express = require('express');
const ClientesController = require('./clientes.controller');

/**
 * Factory function que retorna el router configurado
 * @param {Pool} pool - Pool de conexiones de PostgreSQL
 * @returns {Router} Express router
 */
function createClientesRouter(pool) {
  const router = express.Router();
  const controller = new ClientesController(pool);

  // Obtener todos los clientes
  router.get('/', controller.getAll.bind(controller));

  // Obtener cliente por ID
  router.get('/:id', controller.getById.bind(controller));

  // Crear nuevo cliente
  router.post('/', controller.create.bind(controller));

  // Actualizar cliente
  router.put('/:id', controller.update.bind(controller));

  return router;
}

module.exports = createClientesRouter;
