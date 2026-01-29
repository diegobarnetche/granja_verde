/**
 * Controladores HTTP para Cambios de Moneda
 */
const CambiosService = require('./cambios.service');

class CambiosController {
  constructor(pool) {
    this.service = new CambiosService(pool);
  }

  /**
   * GET /api/cambios/cuentas
   * Obtener todas las cuentas con saldo actual
   */
  async getCuentasConSaldo(req, res) {
    try {
      const cuentas = await this.service.getCuentasConSaldo();
      res.json(cuentas);
    } catch (error) {
      console.error('Error al obtener cuentas:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/cambios/cuentas/:id/saldo
   * Obtener saldo de una cuenta específica
   */
  async getSaldoCuenta(req, res) {
    try {
      const cuenta = await this.service.getSaldoCuenta(req.params.id);
      res.json(cuenta);
    } catch (error) {
      if (error.message === 'Cuenta no encontrada') {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error al obtener saldo:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * POST /api/cambios
   * Registrar un cambio de moneda o transferencia
   *
   * Body esperado:
   * {
   *   id_cuenta_origen: number,
   *   id_cuenta_destino: number,
   *   monto_input: number,
   *   moneda_input: 'ORIGEN' | 'DESTINO',
   *   factor_conversion: number,
   *   nota?: string
   * }
   */
  async registrarCambio(req, res) {
    try {
      const result = await this.service.registrarCambio(req.body);
      res.status(201).json(result);
    } catch (error) {
      // Errores de validación o saldo insuficiente
      if (
        error.message.includes('requeridas') ||
        error.message.includes('diferentes') ||
        error.message.includes('debe ser') ||
        error.message.includes('Saldo insuficiente') ||
        error.message.includes('no encontrada') ||
        error.message.includes('no soportada')
      ) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error al registrar cambio:', error);
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * GET /api/cambios
   * Obtener historial de cambios
   */
  async getHistorial(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const historial = await this.service.getHistorial(
        parseInt(limit),
        parseInt(offset)
      );
      res.json(historial);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = CambiosController;
