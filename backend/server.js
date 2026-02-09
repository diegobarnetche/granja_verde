require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('connect', () => {
  console.log('✓ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error en la conexión de PostgreSQL:', err);
});

async function verificarConexion() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Conexión a la base de datos verificada');
  } catch (error) {
    console.error('Error al verificar conexión:', error);
    process.exit(1);
  }
}

// Endpoint temporal para verificar esquema de tablas
app.get('/api/debug/:tabla-schema', async (req, res) => {
  try {
    const tabla = req.params.tabla.toUpperCase();
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'GV' AND table_name = $1
      ORDER BY ordinal_position
    `, [tabla]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Módulo de ventas/pedidos
const ventasRouter = require('./modules/ventas/ventas.routes');
app.use('/api/ventas', ventasRouter(pool));

// Módulo de gastos
const gastosRouter = require('./modules/gastos/gastos.routes');
app.use('/api/gastos', gastosRouter(pool));

// Módulo de cobros
const cobrosRouter = require('./modules/cobros/cobros.routes');
app.use('/api/cobros', cobrosRouter(pool));

// Módulo de cambios de moneda
const cambiosRouter = require('./modules/cambios/cambios.routes');
app.use('/api/cambios', cambiosRouter(pool));

// Módulo de pedidos
const pedidosRouter = require('./modules/pedidos/pedidos.routes');
app.use('/api/pedidos', pedidosRouter(pool));

// Módulo de ajustes financieros
const ajustesFinancierosRouter = require('./modules/ajustes-financieros/ajustes-financieros.routes');
app.use('/api/ajustes-financieros', ajustesFinancierosRouter(pool));

// Módulo de clientes
const clientesRouter = require('./modules/clientes/clientes.routes');
app.use('/api/clientes', clientesRouter(pool));

verificarConexion().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});

process.on('SIGINT', async () => {
  console.log('\nCerrando conexiones...');
  if (pool) await pool.end();
  process.exit(0);
});
