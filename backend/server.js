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

app.get('/api/gastos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT "ID_GASTO", "FECHA", "MONTO", "MONEDA", "METODO_PAGO", "CATEGORIA", "ESTADO", "CREADO_EN" FROM "GV"."GASTO" ORDER BY "FECHA" DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener gastos:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gastos', async (req, res) => {
  const { fecha, monto, moneda, metodo_pago, categoria, estado } = req.body;

  if (!fecha || !monto || !moneda || !metodo_pago || !categoria) {
    return res.status(400).json({
      error: 'Fecha, monto, moneda, método de pago y categoría son requeridos'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO "GV"."GASTO" ("FECHA", "MONTO", "MONEDA", "METODO_PAGO", "CATEGORIA", "ESTADO", "CREADO_EN")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [fecha, monto, moneda, metodo_pago, categoria, estado || 'PENDIENTE']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear gasto:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/gastos/:id', async (req, res) => {
  const { id } = req.params;
  const { fecha, monto, moneda, metodo_pago, categoria, estado } = req.body;

  try {
    const result = await pool.query(
      `UPDATE "GV"."GASTO"
       SET "FECHA" = $1, "MONTO" = $2, "MONEDA" = $3, "METODO_PAGO" = $4, "CATEGORIA" = $5, "ESTADO" = $6
       WHERE "ID_GASTO" = $7
       RETURNING *`,
      [fecha, monto, moneda, metodo_pago, categoria, estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar gasto:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gastos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM "GV"."GASTO" WHERE "ID_GASTO" = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    res.json({ message: 'Gasto eliminado', gasto: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar gasto:', err);
    res.status(500).json({ error: err.message });
  }
});

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
