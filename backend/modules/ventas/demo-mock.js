/**
 * demo-mock.js
 * Script de demostración del modo mock/dry-run para ventas
 *
 * Ejecutar con: node backend/modules/ventas/demo-mock.js
 *
 * Este script muestra el SQL que se ejecutaría y las tablas resultantes
 * SIN realizar ninguna inserción en la base de datos.
 */

const API_URL = 'http://localhost:3001/api/ventas/mock';

// Escenario 1: PEDIDO con 3 items, pago parcial
const escenarioPedidoPagoParcial = {
  ID_CLIENTE: 1,
  CANAL: 'PEDIDO',
  ESTADO_PREP: 'PENDIENTE',
  ITEMS: [
    { ITEM: 101, CANTIDAD: 2, SUBTOTAL: 150.00 },
    { ITEM: 102, CANTIDAD: 3, SUBTOTAL: 225.50 },
    { ITEM: 103, CANTIDAD: 1, SUBTOTAL: 80.00 },
  ],
  ABONADO: 200.00,
  METODO_PAGO: 'TRANSFERENCIA',
  REFERENCIA: 'TRF-123456',
  NOTA: 'Pago parcial, resto a entregar',
};

// Escenario 2: POS con 1 item, pago completo
const escenarioPOSPagoCompleto = {
  ID_CLIENTE: 2,
  CANAL: 'POS',
  ITEMS: [
    { ITEM: 101, CANTIDAD: 5, SUBTOTAL: 375.00 },
  ],
  ABONADO: 375.00,
  METODO_PAGO: 'EFECTIVO',
};

async function ejecutarDemo() {
  console.log('═'.repeat(80));
  console.log('DEMO MOCK/DRY-RUN - MÓDULO DE VENTAS');
  console.log('═'.repeat(80));
  console.log('\nEste demo muestra el SQL y las tablas que se generarían');
  console.log('sin realizar ninguna inserción en la base de datos.\n');

  // Escenario 1
  console.log('─'.repeat(80));
  console.log('ESCENARIO 1: PEDIDO con 3 items, pago parcial');
  console.log('─'.repeat(80));
  console.log('\nPayload enviado:');
  console.log(JSON.stringify(escenarioPedidoPagoParcial, null, 2));

  try {
    const response1 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(escenarioPedidoPagoParcial),
    });

    const result1 = await response1.json();

    if (response1.ok) {
      console.log('\n✓ Resultado del mock:');
      console.log(`\nModo: ${result1.mode}`);
      console.log(`Timestamp: ${result1.timestamp}`);

      console.log('\n--- SQL que se ejecutaría ---');
      result1.sql_statements.forEach((stmt, i) => {
        console.log(`\n[${i + 1}] Tabla: ${stmt.table}`);
        console.log(stmt.sql);
      });

      console.log('\n--- Tablas resultantes (JSON) ---');
      console.log('\nVENTAS:');
      console.log(JSON.stringify(result1.tables.VENTAS, null, 2));
      console.log('\nDETALLE_VENTAS:');
      console.log(JSON.stringify(result1.tables.DETALLE_VENTAS, null, 2));
      console.log('\nING_TRANSACCIONES:');
      console.log(JSON.stringify(result1.tables.ING_TRANSACCIONES, null, 2));

      console.log('\n--- Resumen ---');
      console.log(JSON.stringify(result1.summary, null, 2));
    } else {
      console.log('\n✗ Error:', result1.error);
      if (result1.errors) {
        result1.errors.forEach((e) => console.log('  -', e));
      }
    }
  } catch (error) {
    console.log('\n✗ Error de conexión:', error.message);
    console.log('  Asegúrate de que el servidor esté corriendo en localhost:3001');
  }

  // Escenario 2
  console.log('\n' + '─'.repeat(80));
  console.log('ESCENARIO 2: POS con 1 item, pago completo');
  console.log('─'.repeat(80));
  console.log('\nPayload enviado:');
  console.log(JSON.stringify(escenarioPOSPagoCompleto, null, 2));

  try {
    const response2 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(escenarioPOSPagoCompleto),
    });

    const result2 = await response2.json();

    if (response2.ok) {
      console.log('\n✓ Resultado del mock:');
      console.log(`\nModo: ${result2.mode}`);
      console.log(`Timestamp: ${result2.timestamp}`);

      console.log('\n--- SQL que se ejecutaría ---');
      result2.sql_statements.forEach((stmt, i) => {
        console.log(`\n[${i + 1}] Tabla: ${stmt.table}`);
        console.log(stmt.sql);
      });

      console.log('\n--- Tablas resultantes (JSON) ---');
      console.log('\nVENTAS:');
      console.log(JSON.stringify(result2.tables.VENTAS, null, 2));
      console.log('\nDETALLE_VENTAS:');
      console.log(JSON.stringify(result2.tables.DETALLE_VENTAS, null, 2));
      console.log('\nING_TRANSACCIONES:');
      console.log(JSON.stringify(result2.tables.ING_TRANSACCIONES, null, 2));

      console.log('\n--- Resumen ---');
      console.log(JSON.stringify(result2.summary, null, 2));
    } else {
      console.log('\n✗ Error:', result2.error);
      if (result2.errors) {
        result2.errors.forEach((e) => console.log('  -', e));
      }
    }
  } catch (error) {
    console.log('\n✗ Error de conexión:', error.message);
    console.log('  Asegúrate de que el servidor esté corriendo en localhost:3001');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('FIN DEL DEMO');
  console.log('═'.repeat(80));
}

// Ejecutar si se llama directamente
ejecutarDemo();
