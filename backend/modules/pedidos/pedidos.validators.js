/**
 * pedidos.validators.js
 * Validaciones para el módulo de pedidos V2
 */

const ESTADOS_PREP = ['PENDIENTE', 'PREPARADO', 'ENTREGADO'];
const ESTADOS_LINEA = ['PENDIENTE', 'PREPARADO']; // A nivel de línea, no hay ENTREGADO

/**
 * Valida que un valor sea un entero positivo válido para BIGINT
 */
function validarBigInt(valor, nombreCampo) {
  const num = Number(valor);
  if (!Number.isInteger(num) || num <= 0) {
    const error = new Error(`${nombreCampo} debe ser un entero positivo válido`);
    error.statusCode = 400;
    throw error;
  }
  return num;
}

/**
 * Valida un array de IDs
 * @param {Array} ids - Array de IDs
 * @param {string} nombreCampo - Nombre del campo para mensajes de error
 * @returns {Array<number>} - Array de IDs validados
 */
function validarArrayIds(ids, nombreCampo) {
  if (!Array.isArray(ids) || ids.length === 0) {
    const error = new Error(`${nombreCampo} debe ser un array con al menos 1 elemento`);
    error.statusCode = 400;
    throw error;
  }

  const idsValidados = [];
  const errores = [];

  ids.forEach((id, index) => {
    const num = Number(id);
    if (!Number.isInteger(num) || num <= 0) {
      errores.push(`${nombreCampo}[${index}] debe ser un entero positivo válido`);
    } else {
      idsValidados.push(num);
    }
  });

  if (errores.length > 0) {
    const error = new Error('Errores de validación');
    error.errors = errores;
    error.statusCode = 400;
    throw error;
  }

  return idsValidados;
}

/**
 * Valida el payload de cambio de estado
 * @param {Object} data - { ESTADO_PREP }
 */
function validarCambioEstado(data) {
  const errors = [];

  if (!data.ESTADO_PREP || !ESTADOS_PREP.includes(data.ESTADO_PREP)) {
    errors.push(`ESTADO_PREP debe ser uno de: ${ESTADOS_PREP.join(', ')}`);
  }

  if (errors.length > 0) {
    const error = new Error('Errores de validación');
    error.errors = errors;
    error.statusCode = 400;
    throw error;
  }

  return data;
}

module.exports = {
  validarBigInt,
  validarArrayIds,
  validarCambioEstado,
  ESTADOS_PREP,
  ESTADOS_LINEA,
};
