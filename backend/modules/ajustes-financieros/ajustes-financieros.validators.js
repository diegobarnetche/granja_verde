/**
 * Validadores para el módulo de Ajustes Financieros
 */

/**
 * Valida el payload para crear un ajuste financiero
 * @param {Object} payload
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateCreateAjuste(payload) {
  const errors = [];

  // Validar campos requeridos
  if (!payload.idTipoAjuste) {
    errors.push('idTipoAjuste es requerido');
  }

  if (!payload.monto || payload.monto <= 0) {
    errors.push('monto debe ser mayor a 0');
  }

  if (!payload.moneda) {
    errors.push('moneda es requerida');
  } else if (!['UYU', 'USD'].includes(payload.moneda)) {
    errors.push('moneda debe ser UYU o USD');
  }

  // Validar detalle
  if (!payload.detalle || !Array.isArray(payload.detalle) || payload.detalle.length === 0) {
    errors.push('detalle debe contener al menos un elemento');
  } else {
    // Validar cada línea de detalle
    payload.detalle.forEach((det, idx) => {
      // Validar que tenga al menos ID_GASTO o ID_VENTA
      if (!det.idGasto && !det.idVenta) {
        errors.push(`detalle[${idx}]: debe incluir idGasto o idVenta (al menos uno)`);
      }

      // Validar monto aplicado
      if (!det.montoAplicado || det.montoAplicado <= 0) {
        errors.push(`detalle[${idx}]: montoAplicado debe ser mayor a 0`);
      }

      // Validar porcentaje (si se envía)
      if (det.porcentaje !== undefined && det.porcentaje !== null) {
        if (det.porcentaje < 0 || det.porcentaje > 100) {
          errors.push(`detalle[${idx}]: porcentaje debe estar entre 0 y 100`);
        }
      }

      // Validar baseCalculo (si se envía)
      if (det.baseCalculo !== undefined && det.baseCalculo !== null) {
        if (det.baseCalculo <= 0) {
          errors.push(`detalle[${idx}]: baseCalculo debe ser mayor a 0`);
        }
      }
    });

    // Validar que la suma de montos aplicados == monto total
    const sumMontos = payload.detalle.reduce((sum, det) => sum + (det.montoAplicado || 0), 0);
    const diff = Math.abs(sumMontos - (payload.monto || 0));

    if (diff > 0.01) { // Tolerancia de 1 centavo por redondeos
      errors.push(
        `La suma de montos aplicados (${sumMontos.toFixed(2)}) debe ser igual al monto total (${payload.monto.toFixed(2)})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida el payload para crear/editar una dimensión
 * @param {Object} payload
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateDimension(payload) {
  const errors = [];

  if (!payload.codigo || payload.codigo.trim() === '') {
    errors.push('codigo es requerido');
  }

  if (!payload.descripcion || payload.descripcion.trim() === '') {
    errors.push('descripcion es requerida');
  }

  if (!payload.naturaleza) {
    errors.push('naturaleza es requerida');
  } else if (!['INGRESO', 'EGRESO'].includes(payload.naturaleza)) {
    errors.push('naturaleza debe ser INGRESO o EGRESO');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateCreateAjuste,
  validateDimension
};
