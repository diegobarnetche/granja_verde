/**
 * Capa de lógica de negocio para Clientes
 */
const queries = require('./clientes.sql');
const { validateCliente } = require('./clientes.validators');

class ClientesService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Obtener todos los clientes
   */
  async getAll() {
    const result = await this.pool.query(queries.getAll);
    return result.rows;
  }

  /**
   * Obtener cliente por ID
   */
  async getById(id) {
    const result = await this.pool.query(queries.getById, [id]);
    if (result.rows.length === 0) {
      throw new Error('Cliente no encontrado');
    }
    return result.rows[0];
  }

  /**
   * Crear nuevo cliente
   */
  async create(clienteData) {
    // Validar y normalizar datos
    const validation = validateCliente(clienteData);

    if (!validation.valid) {
      const error = new Error('Validación fallida');
      error.validationErrors = validation.errors;
      error.statusCode = 400;
      throw error;
    }

    const { nombre, apellido, telefono, direccion, empresa } = validation.data;

    // Verificar si ya existe un cliente con el mismo nombre y teléfono
    const duplicateCheck = await this.pool.query(queries.checkDuplicate, [nombre, telefono]);

    if (duplicateCheck.rows.length > 0) {
      throw new Error(`Ya existe un cliente con el nombre "${nombre}" y teléfono "${telefono}"`);
    }

    // Insertar cliente
    const result = await this.pool.query(queries.insert, [
      nombre,
      apellido,
      telefono,
      direccion,
      empresa
    ]);

    const newCliente = result.rows[0];

    return {
      success: true,
      message: 'Cliente creado exitosamente',
      data: {
        id_client: newCliente.ID_CLIENT,
        nombre,
        apellido,
        telefono,
        direccion,
        empresa,
        creado_en: newCliente.CREADO_EN
      }
    };
  }

  /**
   * Actualizar cliente
   */
  async update(id, clienteData) {
    // Validar que el cliente exista
    await this.getById(id);

    // Validar y normalizar datos
    const validation = validateCliente(clienteData);

    if (!validation.valid) {
      const error = new Error('Validación fallida');
      error.validationErrors = validation.errors;
      error.statusCode = 400;
      throw error;
    }

    const { nombre, apellido, telefono, direccion, empresa } = validation.data;

    // Verificar duplicados (excluyendo el cliente actual)
    const duplicateCheck = await this.pool.query(
      `SELECT "ID_CLIENT" FROM "GV"."CLIENTE" WHERE "NOMBRE" = $1 AND "TELEFONO" = $2 AND "ID_CLIENT" != $3`,
      [nombre, telefono, id]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error(`Ya existe otro cliente con el nombre "${nombre}" y teléfono "${telefono}"`);
    }

    // Actualizar cliente
    const result = await this.pool.query(queries.update, [
      nombre,
      apellido,
      telefono,
      direccion,
      empresa,
      id
    ]);

    return {
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: result.rows[0]
    };
  }
}

module.exports = ClientesService;
