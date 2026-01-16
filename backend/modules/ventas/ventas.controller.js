/**
 * ventas.controller.js
 * Controladores (handlers) para los endpoints de ventas (nuevo esquema)
 */

const VentasService = require('./ventas.service');
const { validarCrearVenta, validarActualizarVenta, validarBigInt, CANALES, ESTADOS_PREP, METODOS_PAGO } = require('./ventas.validators');

class VentasController {
  constructor(pool) {
    this.service = new VentasService(pool);
  }

  /**
   * GET /api/ventas/catalogos
   * Retorna lookups de clientes y productos
   */
  getCatalogos = async (req, res) => {
    try {
      const catalogos = await this.service.getCatalogos();

      // Agregar enumeraciones para el frontend
      catalogos.enums = {
        CANALES,
        ESTADOS_PREP,
        METODOS_PAGO,
      };

      res.json(catalogos);
    } catch (error) {
      console.error('Error al obtener catálogos:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ventas/search/clientes?q=texto
   * Búsqueda de clientes por nombre
   */
  searchClientes = async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) {
        return res.json([]);
      }
      const clientes = await this.service.searchClientes(q);
      res.json(clientes);
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ventas/search/productos?q=texto
   * Búsqueda de productos por descripción
   */
  searchProductos = async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) {
        return res.json([]);
      }
      const productos = await this.service.searchProductos(q);
      res.json(productos);
    } catch (error) {
      console.error('Error al buscar productos:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * POST /api/ventas
   * Crea una venta con detalle y opcionalmente un pago
   */
  crearVenta = async (req, res) => {
    try {
      // Validar datos de entrada
      const dataValidada = validarCrearVenta(req.body);

      // Crear venta
      const result = await this.service.crearVenta(dataValidada);

      res.status(201).json(result);
    } catch (error) {
      console.error('Error al crear venta:', error);

      if (error.statusCode === 400) {
        return res.status(400).json({
          error: error.message,
          errors: error.errors || [],
        });
      }

      res.status(500).json({ error: error.message });
    }
  };

  /**
   * POST /api/ventas/mock
   * Simula la creación de una venta (dry-run) sin persistir en DB
   * Retorna el SQL y las tablas resultantes
   */
  mockCrearVenta = async (req, res) => {
    try {
      // Validar datos de entrada
      const dataValidada = validarCrearVenta(req.body);

      // Simular creación
      const result = await this.service.mockCrearVenta(dataValidada);

      res.json(result);
    } catch (error) {
      console.error('Error en mock de venta:', error);

      if (error.statusCode === 400) {
        return res.status(400).json({
          error: error.message,
          errors: error.errors || [],
        });
      }

      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ventas/:venta_id
   * Obtiene una venta por ID, incluyendo detalle
   */
  getVentaById = async (req, res) => {
    try {
      const ventaId = validarBigInt(req.params.venta_id, 'venta_id');
      const venta = await this.service.getVentaById(ventaId);
      res.json(venta);
    } catch (error) {
      console.error('Error al obtener venta:', error);

      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }

      if (error.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  };

  /**
   * PUT /api/ventas/:venta_id
   * Actualiza una venta y su detalle
   */
  actualizarVenta = async (req, res) => {
    try {
      const ventaId = validarBigInt(req.params.venta_id, 'venta_id');
      const dataValidada = validarActualizarVenta(req.body);

      const ventaActualizada = await this.service.actualizarVenta(ventaId, dataValidada);

      res.json(ventaActualizada);
    } catch (error) {
      console.error('Error al actualizar venta:', error);

      if (error.statusCode === 404) {
        return res.status(404).json({ error: error.message });
      }

      if (error.statusCode === 400) {
        return res.status(400).json({
          error: error.message,
          errors: error.errors || [],
        });
      }

      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ventas?from=YYYY-MM-DD&to=YYYY-MM-DD&canal=POS|PEDIDO&limit=50&offset=0
   * Obtiene listado de ventas con filtros
   */
  getVentas = async (req, res) => {
    try {
      const { from, to, canal, limit, offset } = req.query;

      const filters = {
        from: from || null,
        to: to || null,
        canal: canal || null,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      };

      const ventas = await this.service.getVentas(filters);
      res.json(ventas);
    } catch (error) {
      console.error('Error al obtener listado de ventas:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = VentasController;
