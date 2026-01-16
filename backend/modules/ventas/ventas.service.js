/**
 * ventas.service.js
 * Lógica de negocio y transacciones para ventas (nuevo esquema)
 * Tablas: VENTAS, DETALLE_VENTAS, ING_TRANSACCIONES
 */

const SQL = require('./ventas.sql');
const { calcularEstadoPago } = require('./ventas.validators');

class VentasService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Obtiene los catálogos de clientes y productos
   */
  async getCatalogos() {
    const [clientesResult, productosResult] = await Promise.all([
      this.pool.query(SQL.getClientes),
      this.pool.query(SQL.getProductos),
    ]);

    return {
      clientes: clientesResult.rows,
      productos: productosResult.rows,
    };
  }

  /**
   * Búsqueda de clientes por nombre (lookup con filtro)
   * @param {string} query - Texto a buscar
   */
  async searchClientes(query) {
    const result = await this.pool.query(SQL.searchClientes, [`%${query}%`]);
    return result.rows;
  }

  /**
   * Búsqueda de productos por descripción (lookup con filtro)
   * @param {string} query - Texto a buscar
   */
  async searchProductos(query) {
    const result = await this.pool.query(SQL.searchProductos, [`%${query}%`]);
    return result.rows;
  }

  /**
   * Verifica que todos los productos existan en la DB y retorna sus UMDs
   * @param {number[]} productosIds - Array de IDs de productos (ITEM)
   * @returns {Promise<Map<number, number>>} Map de ITEM -> UMD
   * @throws {Error} Si algún producto no existe
   */
  async verificarProductosExisten(productosIds) {
    const result = await this.pool.query(SQL.checkProductosExisten, [productosIds]);
    const existentes = result.rows.map((r) => Number(r.ITEM));
    const faltantes = productosIds.filter((id) => !existentes.includes(id));

    if (faltantes.length > 0) {
      const error = new Error(`Los siguientes productos no existen: ${faltantes.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // Retornar un Map con ITEM -> UMD
    const umdMap = new Map();
    result.rows.forEach((row) => {
      umdMap.set(Number(row.ITEM), Number(row.UMD));
    });
    return umdMap;
  }

  /**
   * Crea una venta completa en una transacción atómica
   * Inserta: VENTAS + DETALLE_VENTAS + ING_TRANSACCIONES (si hay abono)
   * @param {Object} data - Datos validados de la venta
   * @returns {Promise<Object>} - IDs generados y resumen
   */
  async crearVenta(data) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que todos los productos existan y obtener sus UMDs
      const productosIds = data.ITEMS.map((item) => item.ITEM);
      const umdMap = await this.verificarProductosExisten(productosIds);

      // Calcular TOTAL y SALDO_PENDIENTE
      const total = data.TOTAL; // Ya calculado en el validator
      const abonado = data.ABONADO || 0;
      const saldoPendiente = Math.round((total - abonado) * 100) / 100;
      const estadoPago = calcularEstadoPago(abonado, total);

      // Timestamp actual
      const fechaVenta = new Date();

      // Insertar VENTAS
      const ventaResult = await client.query(SQL.insertVenta, [
        fechaVenta,
        data.ID_CLIENTE,
        data.CANAL,
        total,
        data.ESTADO_PREP, // null si es POS
        estadoPago,
        saldoPendiente,
      ]);
      const ventaId = ventaResult.rows[0].ID_VENTA;

      // Insertar DETALLE_VENTAS
      for (const item of data.ITEMS) {
        const umd = umdMap.get(item.ITEM);
        // CANTIDAD_UNIDADES = CANTIDAD * UMD (según regla existente en el repo)
        const cantidadUnidades = Math.round(item.CANTIDAD * umd);

        await client.query(SQL.insertDetalleVenta, [
          ventaId,
          item.ITEM,
          umd,
          item.CANTIDAD,
          cantidadUnidades,
          item.SUBTOTAL,
        ]);
      }

      // Insertar ING_TRANSACCIONES solo si ABONADO > 0
      let ingId = null;
      if (abonado > 0) {
        const ingResult = await client.query(SQL.insertIngTransaccion, [
          fechaVenta,
          data.ID_CLIENTE,
          abonado,
          data.METODO_PAGO,
          data.REFERENCIA || null,
          data.NOTA || null,
          'ACTIVO',
        ]);
        ingId = ingResult.rows[0].ID_ING;
      }

      await client.query('COMMIT');

      return {
        ID_VENTA: ventaId,
        ID_ING: ingId,
        TOTAL: total,
        ABONADO: abonado,
        SALDO_PENDIENTE: saldoPendiente,
        ESTADO: estadoPago,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene una venta por ID, incluyendo detalle
   * @param {number} ventaId
   * @returns {Promise<Object>}
   */
  async getVentaById(ventaId) {
    const ventaResult = await this.pool.query(SQL.getVentaById, [ventaId]);

    if (ventaResult.rows.length === 0) {
      const error = new Error('Venta no encontrada');
      error.statusCode = 404;
      throw error;
    }

    const venta = ventaResult.rows[0];

    // Traer el detalle
    const detalleResult = await this.pool.query(SQL.getDetalleByVentaId, [ventaId]);
    venta.DETALLE = detalleResult.rows;

    return venta;
  }

  /**
   * Actualiza una venta y su detalle
   * @param {number} ventaId
   * @param {Object} data - Datos validados
   * @returns {Promise<Object>}
   */
  async actualizarVenta(ventaId, data) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que la venta exista
      const ventaResult = await client.query(SQL.getVentaById, [ventaId]);
      if (ventaResult.rows.length === 0) {
        const error = new Error('Venta no encontrada');
        error.statusCode = 404;
        throw error;
      }

      const ventaActual = ventaResult.rows[0];

      // Si se enviaron ITEMS, reemplazar el detalle
      let nuevoTotal = ventaActual.TOTAL;
      if (data.ITEMS && Array.isArray(data.ITEMS) && data.ITEMS.length > 0) {
        // Verificar que todos los productos existan y obtener sus UMDs
        const productosIds = data.ITEMS.map((item) => item.ITEM);
        const umdMap = await this.verificarProductosExisten(productosIds);

        // Eliminar detalle anterior
        await client.query(SQL.deleteDetalleByVentaId, [ventaId]);

        // Insertar nuevo detalle
        nuevoTotal = 0;
        for (const item of data.ITEMS) {
          const umd = umdMap.get(item.ITEM);
          const cantidadUnidades = Math.round(item.CANTIDAD * umd);

          await client.query(SQL.insertDetalleVenta, [
            ventaId,
            item.ITEM,
            umd,
            item.CANTIDAD,
            cantidadUnidades,
            item.SUBTOTAL,
          ]);
          nuevoTotal += item.SUBTOTAL;
        }
        nuevoTotal = Math.round(nuevoTotal * 100) / 100;
      }

      // Calcular nuevo estado de pago si cambió el abonado
      const abonado = data.ABONADO !== undefined ? data.ABONADO : (Number(ventaActual.TOTAL) - Number(ventaActual.SALDO_PENDIENTE));
      const saldoPendiente = Math.round((nuevoTotal - abonado) * 100) / 100;
      const estadoPago = calcularEstadoPago(abonado, nuevoTotal);

      // Actualizar VENTAS
      const ventaUpdated = await client.query(SQL.updateVenta, [
        ventaId,
        data.CANAL || ventaActual.CANAL,
        nuevoTotal,
        data.ESTADO_PREP !== undefined ? data.ESTADO_PREP : ventaActual.ESTADO_PREP,
        estadoPago,
        saldoPendiente,
      ]);

      await client.query('COMMIT');

      return ventaUpdated.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene listado de ventas con filtros
   * @param {Object} filters - Filtros (from, to, canal, limit, offset)
   * @returns {Promise<Array>}
   */
  async getVentas(filters = {}) {
    const { from, to, canal, limit = 50, offset = 0 } = filters;

    const result = await this.pool.query(SQL.getVentas, [
      from || null,
      to || null,
      canal || null,
      limit,
      offset,
    ]);

    return result.rows;
  }

  // ===== MOCK / DRY-RUN MODE =====

  /**
   * Simula la creación de una venta sin persistir en la DB
   * Retorna el SQL que se ejecutaría y los datos resultantes
   * @param {Object} data - Datos validados de la venta
   * @returns {Object} - Resultado simulado con SQL y tablas
   */
  async mockCrearVenta(data) {
    // Simular verificación de productos (usando datos mock si no hay DB)
    let umdMap = new Map();
    try {
      const productosIds = data.ITEMS.map((item) => item.ITEM);
      umdMap = await this.verificarProductosExisten(productosIds);
    } catch (error) {
      // En modo mock, usar UMD default de 30 si no hay conexión a DB
      data.ITEMS.forEach((item) => {
        umdMap.set(item.ITEM, 30);
      });
    }

    // Generar IDs simulados
    const mockVentaId = Math.floor(Math.random() * 1000000) + 1;
    const mockIngId = data.ABONADO > 0 ? Math.floor(Math.random() * 1000000) + 1 : null;
    const fechaVenta = new Date().toISOString();

    // Calcular totales
    const total = data.TOTAL;
    const abonado = data.ABONADO || 0;
    const saldoPendiente = Math.round((total - abonado) * 100) / 100;
    const estadoPago = calcularEstadoPago(abonado, total);

    // Construir fila de VENTAS
    const ventaRow = {
      ID_VENTA: mockVentaId,
      FECHA_VENTA: fechaVenta,
      ID_CLIENTE: data.ID_CLIENTE,
      CANAL: data.CANAL,
      TOTAL: total,
      ESTADO_PREP: data.ESTADO_PREP,
      ESTADO: estadoPago,
      SALDO_PENDIENTE: saldoPendiente,
    };

    // Construir filas de DETALLE_VENTAS
    const detalleRows = data.ITEMS.map((item, index) => {
      const umd = umdMap.get(item.ITEM) || 30;
      const cantidadUnidades = Math.round(item.CANTIDAD * umd);
      return {
        ID_DETALLE: mockVentaId * 100 + index + 1,
        ID_VENTA: mockVentaId,
        ITEM: item.ITEM,
        UMD: umd,
        CANTIDAD: item.CANTIDAD,
        CANTIDAD_UNIDADES: cantidadUnidades,
        SUBTOTAL: item.SUBTOTAL,
      };
    });

    // Construir fila de ING_TRANSACCIONES (si aplica)
    let ingRow = null;
    if (abonado > 0) {
      ingRow = {
        ID_ING: mockIngId,
        FECHA_ING: fechaVenta,
        ID_CLIENTE: data.ID_CLIENTE,
        MONTO: abonado,
        METODO_PAGO: data.METODO_PAGO,
        REFERENCIA: data.REFERENCIA || null,
        NOTA: data.NOTA || null,
        ESTADO: 'ACTIVO',
      };
    }

    // Generar SQL pseudo-código
    const sqlStatements = [];

    sqlStatements.push({
      table: 'VENTAS',
      sql: `INSERT INTO "GV"."VENTAS" ("FECHA_VENTA", "ID_CLIENTE", "CANAL", "TOTAL", "ESTADO_PREP", "ESTADO", "SALDO_PENDIENTE") VALUES ('${fechaVenta}', ${data.ID_CLIENTE}, '${data.CANAL}', ${total}, ${data.ESTADO_PREP ? `'${data.ESTADO_PREP}'` : 'NULL'}, '${estadoPago}', ${saldoPendiente}) RETURNING "ID_VENTA";`,
    });

    detalleRows.forEach((row) => {
      sqlStatements.push({
        table: 'DETALLE_VENTAS',
        sql: `INSERT INTO "GV"."DETALLE_VENTAS" ("ID_VENTA", "ITEM", "UMD", "CANTIDAD", "CANTIDAD_UNIDADES", "SUBTOTAL") VALUES (${mockVentaId}, ${row.ITEM}, ${row.UMD}, ${row.CANTIDAD}, ${row.CANTIDAD_UNIDADES}, ${row.SUBTOTAL}) RETURNING "ID_DETALLE";`,
      });
    });

    if (ingRow) {
      sqlStatements.push({
        table: 'ING_TRANSACCIONES',
        sql: `INSERT INTO "GV"."ING_TRANSACCIONES" ("FECHA_ING", "ID_CLIENTE", "MONTO", "METODO_PAGO", "REFERENCIA", "NOTA", "ESTADO") VALUES ('${fechaVenta}', ${data.ID_CLIENTE}, ${abonado}, '${data.METODO_PAGO}', ${data.REFERENCIA ? `'${data.REFERENCIA}'` : 'NULL'}, ${data.NOTA ? `'${data.NOTA}'` : 'NULL'}, 'ACTIVO') RETURNING "ID_ING";`,
      });
    }

    return {
      mode: 'DRY-RUN (no se guardó en la base de datos)',
      timestamp: fechaVenta,
      sql_statements: sqlStatements,
      tables: {
        VENTAS: [ventaRow],
        DETALLE_VENTAS: detalleRows,
        ING_TRANSACCIONES: ingRow ? [ingRow] : [],
      },
      summary: {
        ID_VENTA: mockVentaId,
        ID_ING: mockIngId,
        TOTAL: total,
        ABONADO: abonado,
        SALDO_PENDIENTE: saldoPendiente,
        ESTADO: estadoPago,
        ITEMS_COUNT: data.ITEMS.length,
      },
    };
  }
}

module.exports = VentasService;
