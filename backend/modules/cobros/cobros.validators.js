/**
 * cobros.validators.js
 * Validaciones para el módulo de cobros
 */

const METODOS_PAGO = ['DEBITO', 'CREDITO', 'TRANSFERENCIA', 'EFECTIVO', 'OTROS'];
const MODOS_PAGO = ['FULL', 'PARTIAL'];

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
 * Valida y normaliza un monto a 2 decimales
 */
function validarMonto(monto, nombreCampo) {
  const num = Number(monto);
  if (isNaN(num) || num < 0) {
    throw new Error(`${nombreCampo} debe ser un número válido mayor o igual a 0`);
  }
  return Math.round(num * 100) / 100;
}

/**
 * Calcula el estado de pago según saldo pendiente
 */
function calcularEstadoPago(saldoPendiente, total) {
  if (saldoPendiente <= 0) return 'PAGO';
  if (saldoPendiente < total) return 'PAGO PARCIAL';
  return 'PAGO PENDIENTE';
}

/**
 * Valida el payload de registro de pago
 * @param {Object} data - { ID_CLIENTE, MODE, PAYMENT_LINES: [{monto, metodo_pago, referencia?, nota?}] }
 */
function validarRegistrarPago(data) {
  const errors = [];

  // Validar ID_CLIENTE
  try {
    data.ID_CLIENTE = validarBigInt(data.ID_CLIENTE, 'ID_CLIENTE');
  } catch (error) {
    errors.push(error.message);
  }

  // Validar MODE
  if (!data.MODE || !MODOS_PAGO.includes(data.MODE)) {
    errors.push(`MODE debe ser uno de: ${MODOS_PAGO.join(', ')}`);
  }

  // Validar PAYMENT_LINES
  if (!Array.isArray(data.PAYMENT_LINES) || data.PAYMENT_LINES.length === 0) {
    errors.push('PAYMENT_LINES es obligatorio y debe contener al menos 1 elemento');
  } else {
    let totalPago = 0;
    data.PAYMENT_LINES.forEach((line, index) => {
      // Validar monto
      try {
        line.monto = validarMonto(line.monto, `PAYMENT_LINES[${index}].monto`);
        if (line.monto <= 0) {
          errors.push(`PAYMENT_LINES[${index}].monto debe ser mayor a 0`);
        }
        totalPago += line.monto;
      } catch (error) {
        errors.push(error.message);
      }

      // Validar metodo_pago
      if (!line.metodo_pago || !METODOS_PAGO.includes(line.metodo_pago)) {
        errors.push(`PAYMENT_LINES[${index}].metodo_pago debe ser uno de: ${METODOS_PAGO.join(', ')}`);
      }

      // referencia y nota son opcionales (strings)
    });

    // Guardar total calculado
    data.TOTAL_PAGO = Math.round(totalPago * 100) / 100;
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
  validarRegistrarPago,
  validarBigInt,
  validarMonto,
  calcularEstadoPago,
  METODOS_PAGO,
  MODOS_PAGO,
};
