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
  // Soporta DOS formatos:
  // 1. PAGOS: array de líneas [{monto, metodo_pago, referencia?, nota?}] (nuevo, recomendado)
  // 2. ABONADO + METODO_PAGO (legacy, se convierte a PAGOS internamente)

  // Calcular TOTAL de los subtotales primero
  if (data.ITEMS && Array.isArray(data.ITEMS) && data.ITEMS.length > 0) {
    data.TOTAL = data.ITEMS.reduce((sum, item) => sum + (item.SUBTOTAL || 0), 0);
    data.TOTAL = Math.round(data.TOTAL * 100) / 100;
  }

  // El frontend puede enviar el campo como "PAGOS" o "pagos"
  // IMPORTANTE: guardar el input ANTES de reinicializar data.PAGOS
  const pagosInput = data.PAGOS || data.pagos || [];

  // Inicializar PAGOS como array vacío (se llenará después)
  data.PAGOS = [];
  data.TOTAL_PAGOS = 0;

  // Formato nuevo: PAGOS array
  if (Array.isArray(pagosInput) && pagosInput.length > 0) {
    let totalPagos = 0;
    pagosInput.forEach((line, index) => {
      // Validar monto
      const monto = Number(line.monto);
      if (isNaN(monto) || monto <= 0) {
        errors.push(`PAGOS[${index}].monto debe ser un número mayor a 0`);
      } else {
        totalPagos += monto;
      }

      // Validar metodo_pago
      if (!line.metodo_pago || !METODOS_PAGO.includes(line.metodo_pago)) {
        errors.push(`PAGOS[${index}].metodo_pago debe ser uno de: ${METODOS_PAGO.join(', ')}`);
      }
    });

    totalPagos = Math.round(totalPagos * 100) / 100;

    // Validar que no exceda el total
    if (totalPagos > data.TOTAL) {
      errors.push(`El total de pagos ($${totalPagos}) no puede exceder el TOTAL de la venta ($${data.TOTAL})`);
    }

    data.PAGOS = pagosInput.map(line => ({
      monto: Math.round(Number(line.monto) * 100) / 100,
      metodo_pago: line.metodo_pago,
      referencia: line.referencia || null,
      nota: line.nota || null,
    }));
    data.TOTAL_PAGOS = totalPagos;

  // Formato legacy: ABONADO + METODO_PAGO (convertir a PAGOS)
  } else if (data.ABONADO !== undefined && data.ABONADO !== null) {
    try {
      const abonado = validarMonto(data.ABONADO, 'ABONADO');

      if (abonado > 0) {
        // Validar METODO_PAGO
        if (!data.METODO_PAGO || !METODOS_PAGO.includes(data.METODO_PAGO)) {
          errors.push(`METODO_PAGO es obligatorio cuando ABONADO > 0 y debe ser uno de: ${METODOS_PAGO.join(', ')}`);
        }

        // Validar que no exceda el total
        if (abonado > data.TOTAL) {
          errors.push(`ABONADO ($${abonado}) no puede ser mayor que TOTAL ($${data.TOTAL})`);
        }

        // Convertir a formato PAGOS
        if (errors.length === 0 || !errors.some(e => e.includes('METODO_PAGO'))) {
          data.PAGOS = [{
            monto: abonado,
            metodo_pago: data.METODO_PAGO,
            referencia: data.REFERENCIA || null,
            nota: data.NOTA || null,
          }];
          data.TOTAL_PAGOS = abonado;
        }
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  // Compatibilidad: mantener ABONADO para respuestas
  data.ABONADO = data.TOTAL_PAGOS;

  // REFERENCIA y NOTA son opcionales (strings) - ya procesados arriba

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
