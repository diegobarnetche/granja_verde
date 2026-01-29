/**
 * Validadores para el módulo de Gastos V2
 */

const MONEDAS_VALIDAS = ['UYU', 'USD'];
const METODOS_PAGO_VALIDOS = ['EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'OTRO'];

/**
 * Valida una línea de pago individual
 */
function validatePaymentLine(line, index, expenseMoneda) {
  const errors = [];
  const prefix = `paymentLines[${index}]`;

  if (!line.metodo_pago) {
    errors.push(`${prefix}.metodo_pago es requerido`);
  } else if (!METODOS_PAGO_VALIDOS.includes(line.metodo_pago)) {
    errors.push(`${prefix}.metodo_pago debe ser uno de: ${METODOS_PAGO_VALIDOS.join(', ')}`);
  }

  if (line.monto === undefined || line.monto === null) {
    errors.push(`${prefix}.monto es requerido`);
  } else if (typeof line.monto !== 'number' || line.monto <= 0) {
    errors.push(`${prefix}.monto debe ser un número mayor a 0`);
  }

  return errors;
}

/**
 * Valida un gasto individual del batch
 */
function validateExpense(expense, index) {
  const errors = [];
  const prefix = `expenses[${index}]`;

  // FECHA requerida
  if (!expense.fecha) {
    errors.push(`${prefix}.fecha es requerida`);
  }

  // MONTO_TOTAL > 0
  if (expense.monto_total === undefined || expense.monto_total === null) {
    errors.push(`${prefix}.monto_total es requerido`);
  } else if (typeof expense.monto_total !== 'number' || expense.monto_total <= 0) {
    errors.push(`${prefix}.monto_total debe ser un número mayor a 0`);
  }

  // MONEDA válida
  if (!expense.moneda) {
    errors.push(`${prefix}.moneda es requerida`);
  } else if (!MONEDAS_VALIDAS.includes(expense.moneda)) {
    errors.push(`${prefix}.moneda debe ser UYU o USD`);
  }

  // CATEGORIA requerida
  if (!expense.id_categoria) {
    errors.push(`${prefix}.id_categoria es requerida`);
  }

  // PAYMENT LINES - validar estructura
  const paymentLines = expense.paymentLines || [];

  // Validar cada línea de pago
  paymentLines.forEach((line, lineIndex) => {
    const lineErrors = validatePaymentLine(line, lineIndex, expense.moneda);
    errors.push(...lineErrors.map(e => `${prefix}.${e}`));
  });

  // Calcular suma de pagos
  const sumaPagos = paymentLines.reduce((sum, line) => sum + (line.monto || 0), 0);

  // Validar que suma no exceda total
  if (expense.monto_total && sumaPagos > expense.monto_total) {
    errors.push(`${prefix}: La suma de pagos (${sumaPagos}) excede el monto total (${expense.monto_total})`);
  }

  // Validar FECHA_VENCIMIENTO según escenario
  if (expense.monto_total) {
    const espagoCompleto = sumaPagos === expense.monto_total;
    const espagoParcial = sumaPagos > 0 && sumaPagos < expense.monto_total;
    const esSinPago = sumaPagos === 0;

    if (esSinPago || espagoParcial) {
      if (!expense.fecha_vencimiento) {
        errors.push(`${prefix}.fecha_vencimiento es requerida cuando el pago es parcial o no hay pago`);
      }
    }

    if (espagoCompleto && expense.fecha_vencimiento) {
      // Ignorar fecha_vencimiento si es pago completo (no es error, pero se ignora)
    }
  }

  return errors;
}

/**
 * Valida el payload completo del batch de gastos
 */
function validateExpensesBatch(payload) {
  const errors = [];

  // Validar estructura básica
  if (!payload) {
    return { valid: false, errors: ['El payload es requerido'] };
  }

  if (!Array.isArray(payload.expenses) || payload.expenses.length === 0) {
    return { valid: false, errors: ['expenses[] debe ser un array no vacío'] };
  }

  // Validar cada gasto
  payload.expenses.forEach((expense, index) => {
    const expenseErrors = validateExpense(expense, index);
    errors.push(...expenseErrors);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Determina el escenario de pago para un gasto
 * @returns 'FULL' | 'PARTIAL' | 'NONE'
 */
function determinePaymentScenario(expense) {
  const paymentLines = expense.paymentLines || [];
  const sumaPagos = paymentLines.reduce((sum, line) => sum + (line.monto || 0), 0);

  if (sumaPagos === 0) return 'NONE';
  if (sumaPagos === expense.monto_total) return 'FULL';
  return 'PARTIAL';
}

/**
 * Convierte método de pago legacy a V2
 * CREDITO no es un pago real, se trata como sin pago
 */
function convertLegacyMetodoPago(metodoPago) {
  if (metodoPago === 'CREDITO') {
    return null; // No es un pago real
  }
  if (METODOS_PAGO_VALIDOS.includes(metodoPago)) {
    return metodoPago;
  }
  return null;
}

/**
 * Convierte moneda legacy a V2
 */
function convertLegacyMoneda(moneda) {
  const mapping = {
    'UY$': 'UYU',
    'US$': 'USD',
    'UYU': 'UYU',
    'USD': 'USD'
  };
  return mapping[moneda] || null;
}

module.exports = {
  validateExpensesBatch,
  validateExpense,
  validatePaymentLine,
  determinePaymentScenario,
  convertLegacyMetodoPago,
  convertLegacyMoneda,
  MONEDAS_VALIDAS,
  METODOS_PAGO_VALIDOS
};
