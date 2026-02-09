/**
 * Controladores HTTP para Clientes
 */
const ClientesService = require('./clientes.service');

class ClientesController {
  constructor(pool) {
    this.service = new ClientesService(pool);
  }

  /**
   * GET /api/clientes
   * Obtener todos los clientes
   */
  async getAll(req, res) {
    try {
      const clientes = await this.service.getAll();
      res.json(clientes);
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).json({ error: error.message });
    }
  }


  /**
   * GET /api/clientes/:id
   * Obtener cliente por ID
   */
  async getById(req, res) {
    try {
      const cliente = await this.service.getById(req.params.id);
      res.json(cliente);
    } catch (error) {
      if (error.message === 'Cliente no encontrado') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * POST /api/clientes
   * Crear nuevo cliente
   * Body: { nombre, apellido?, telefono, direccion?, empresa? }
   */
  async create(req, res) {
    try {
      const result = await this.service.create(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error.validationErrors) {
        res.status(400).json({
          error: 'Validación fallida',
          details: error.validationErrors
        });
      } else if (error.message.includes('Ya existe')) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * PUT /api/clientes/:id
   * Actualizar cliente
   * Body: { nombre, apellido?, telefono, direccion?, empresa? }
   */
  async update(req, res) {
    try {
      const result = await this.service.update(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      if (error.validationErrors) {
        res.status(400).json({
          error: 'Validación fallida',
          details: error.validationErrors
        });
      } else if (error.message === 'Cliente no encontrado') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Ya existe')) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }
}

module.exports = ClientesController;
