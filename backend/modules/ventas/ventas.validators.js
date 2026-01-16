/**
 * ventas.validators.js
 * Validaciones de negocio para ventas (nuevo esquema)
 */

// Enumeraciones según el nuevo esquema
const CANALES = ['POS', 'PEDIDO'];
const ESTADOS_PREP = ['PENDIENTE', 'PREPARADO', 'ENTREGADO'];
const METODOS_PAGO = ['DEBITO', 'CREDITO', 'TRANSFERENCIA', 'EFECTIVO', 'OTROS'];

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
 * Valida que la cantidad sea un entero positivo
 * Según el nuevo esquema: "user enters integer, validate integer"
 */
function validarCantidad(cantidad) {
  const num = Number(cantidad);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error('CANTIDAD debe ser un entero positivo');
  }
  return num;
}

/**
 * Calcula el estado de pago según las reglas de negocio
 * @param {number} abonado - Monto abonado
 * @param {number} total - Total de la venta
 * @returns {string} - Estado de pago
 */
// CHECK: ESTADO IN ('PAGO PENDIENTE','PAGO PARCIAL','PAGO','CANCELADO')
function calcularEstadoPago(abonado, total) {
  if (abonado === 0) return 'PAGO PENDIENTE';
  if (abonado < total) return 'PAGO PARCIAL';
  return 'PAGO';
}

/**
 * Valida el payload de creación de venta (nuevo esquema)
 * Step 1: Cliente, Canal, EstadoPrep (si PEDIDO)
 * Step 2: Items con ITEM, CANTIDAD (int), SUBTOTAL
 * Step 3: Pago opcional (abonado, metodo_pago, referencia, nota)
 */
function validarCrearVenta(data) {
  const errors = [];

  // ===== Validar datos del encabezado (Step 1) =====

  // Validar ID_CLIENTE
  try {
    data.ID_CLIENTE = validarBigInt(data.ID_CLIENTE, 'ID_CLIENTE');
  } catch (error) {
    errors.push(error.message);
  }

  // Validar CANAL
  if (!data.CANAL || !CANALES.includes(data.CANAL)) {
    errors.push(`CANAL debe ser uno de: ${CANALES.join(', ')}`);
  }

  // Validar ESTADO_PREP (solo si CANAL='PEDIDO')
  if (data.CANAL === 'PEDIDO') {
    if (data.ESTADO_PREP && !ESTADOS_PREP.includes(data.ESTADO_PREP)) {
      errors.push(`ESTADO_PREP debe ser uno de: ${ESTADOS_PREP.join(', ')}`);
    }
    // Default a 'PENDIENTE' si no se proporciona
    if (!data.ESTADO_PREP) {
      data.ESTADO_PREP = 'PENDIENTE';
    }
  } else {
    // Para POS, ESTADO_PREP es NULL
    data.ESTADO_PREP = null;
  }

  // ===== Validar Items (Step 2) =====

  if (!Array.isArray(data.ITEMS) || data.ITEMS.length === 0) {
    errors.push('ITEMS es obligatorio y debe contener al menos 1 elemento');
  } else {
    data.ITEMS.forEach((item, index) => {
      // Validar ITEM (ID del producto)
      try {
        item.ITEM = validarBigInt(item.ITEM, `ITEMS[${index}].ITEM`);
      } catch (error) {
        errors.push(error.message);
      }

      // Validar CANTIDAD (entero)
      try {
        item.CANTIDAD = validarCantidad(item.CANTIDAD);
      } catch (error) {
        errors.push(`ITEMS[${index}].${error.message}`);
      }

      // Validar SUBTOTAL (monto con 2 decimales)
      try {
        item.SUBTOTAL = validarMonto(item.SUBTOTAL, `ITEMS[${index}].SUBTOTAL`);
      } catch (error) {
        errors.push(error.message);
      }

      // UMD y CANTIDAD_UNIDADES se calculan en el backend
    });
  }

  // ===== Validar Pago (Step 3 - opcional) =====

  // ABONADO es opcional, default 0
  if (data.ABONADO !== undefined) {
    try {
      data.ABONADO = validarMonto(data.ABONADO, 'ABONADO');
    } catch (error) {
      errors.push(error.message);
    }
  } else {
    data.ABONADO = 0;
  }

  // Calcular TOTAL de los subtotales
  if (data.ITEMS && Array.isArray(data.ITEMS) && data.ITEMS.length > 0) {
    data.TOTAL = data.ITEMS.reduce((sum, item) => sum + (item.SUBTOTAL || 0), 0);
    data.TOTAL = Math.round(data.TOTAL * 100) / 100;
  }

  // Validar ABONADO <= TOTAL
  if (data.ABONADO > data.TOTAL) {
    errors.push('ABONADO no puede ser mayor que TOTAL');
  }

  // Si hay abono, validar METODO_PAGO
  if (data.ABONADO > 0) {
    if (!data.METODO_PAGO || !METODOS_PAGO.includes(data.METODO_PAGO)) {
      errors.push(`METODO_PAGO es obligatorio cuando ABONADO > 0 y debe ser uno de: ${METODOS_PAGO.join(', ')}`);
    }
  }

  // REFERENCIA y NOTA son opcionales (strings)

  if (errors.length > 0) {
    const error = new Error('Errores de validación');
    error.errors = errors;
    error.statusCode = 400;
    throw error;
  }

  return data;
}

/**
 * Valida el payload de actualización de venta
 */
function validarActualizarVenta(data) {
  const errors = [];

  // Validar CANAL
  if (data.CANAL && !CANALES.includes(data.CANAL)) {
    errors.push(`CANAL debe ser uno de: ${CANALES.join(', ')}`);
  }

  // Validar ESTADO_PREP
  if (data.ESTADO_PREP && !ESTADOS_PREP.includes(data.ESTADO_PREP)) {
    errors.push(`ESTADO_PREP debe ser uno de: ${ESTADOS_PREP.join(', ')}`);
  }

  // Validar METODO_PAGO
  if (data.METODO_PAGO && !METODOS_PAGO.includes(data.METODO_PAGO)) {
    errors.push(`METODO_PAGO debe ser uno de: ${METODOS_PAGO.join(', ')}`);
  }

  // Validar ABONADO
  if (data.ABONADO !== undefined) {
    try {
      data.ABONADO = validarMonto(data.ABONADO, 'ABONADO');
    } catch (error) {
      errors.push(error.message);
    }
  }

  // Validar ITEMS si existen
  if (data.ITEMS && Array.isArray(data.ITEMS)) {
    data.ITEMS.forEach((item, index) => {
      try {
        item.ITEM = validarBigInt(item.ITEM, `ITEMS[${index}].ITEM`);
      } catch (error) {
        errors.push(error.message);
      }

      try {
        item.CANTIDAD = validarCantidad(item.CANTIDAD);
      } catch (error) {
        errors.push(`ITEMS[${index}].${error.message}`);
      }

      try {
        item.SUBTOTAL = validarMonto(item.SUBTOTAL, `ITEMS[${index}].SUBTOTAL`);
      } catch (error) {
        errors.push(error.message);
      }
    });
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
  validarCrearVenta,
  validarActualizarVenta,
  validarBigInt,
  validarMonto,
  validarCantidad,
  calcularEstadoPago,
  CANALES,
  ESTADOS_PREP,
  METODOS_PAGO,
};
