/**
 * ventas.routes.js
 * Definición de rutas para el módulo de ventas (nuevo esquema)
 */

const express = require('express');
const VentasController = require('./ventas.controller');

function createVentasRouter(pool) {
  const router = express.Router();
  const controller = new VentasController(pool);

  // GET /api/ventas/catalogos - Obtener lookups de clientes, productos y enums
  router.get('/catalogos', controller.getCatalogos);

  // GET /api/ventas/search/clientes?q=texto - Búsqueda de clientes
  router.get('/search/clientes', controller.searchClientes);

  // GET /api/ventas/search/productos?q=texto - Búsqueda de productos
  router.get('/search/productos', controller.searchProductos);

  // POST /api/ventas/mock - Simular creación de venta (dry-run)
  router.post('/mock', controller.mockCrearVenta);

  // GET /api/ventas - Listado de ventas con filtros
  router.get('/', controller.getVentas);

  // GET /api/ventas/:venta_id - Obtener una venta específica con detalle
  router.get('/:venta_id', controller.getVentaById);

  // POST /api/ventas - Crear una venta
  router.post('/', controller.crearVenta);

  // PUT /api/ventas/:venta_id - Actualizar una venta
  router.put('/:venta_id', controller.actualizarVenta);

  return router;
}

module.exports = createVentasRouter;
