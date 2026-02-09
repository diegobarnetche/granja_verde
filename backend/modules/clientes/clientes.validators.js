/**
 * Validadores para el módulo de Clientes
 */

/**
 * Convierte un string a mayúsculas, maneja null/undefined
 */
function toUpperCase(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value).toUpperCase().trim();
}

/**
 * Valida y normaliza los datos del cliente
 * @param {Object} clienteData - Datos del cliente
 * @returns {Object} { valid: boolean, errors: string[], data: Object }
 */
function validateCliente(clienteData) {
  const errors = [];

  // Normalizar datos (convertir a mayúsculas)
  const normalizedData = {
    nombre: toUpperCase(clienteData.nombre),
    apellido: toUpperCase(clienteData.apellido),
    telefono: clienteData.telefono ? String(clienteData.telefono).trim() : null,
    direccion: toUpperCase(clienteData.direccion),
    empresa: toUpperCase(clienteData.empresa)
  };

  // Validar campos obligatorios
  if (!normalizedData.nombre) {
    errors.push('El campo NOMBRE es obligatorio');
  }

  if (!normalizedData.telefono) {
    errors.push('El campo TELEFONO es obligatorio');
  }

  // Validar longitud del teléfono (opcional, ajustar según necesidad)
  if (normalizedData.telefono && normalizedData.telefono.length < 6) {
    errors.push('El TELEFONO debe tener al menos 6 caracteres');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: normalizedData
  };
}

module.exports = {
  validateCliente,
  toUpperCase
};
