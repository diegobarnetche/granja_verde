# Aplicación de Gestión de Gastos - Granja Verde

Webapp funcional para gestionar gastos con Node.js, Express, PostgreSQL y React.

## Estructura del Proyecto

```
GRANJA VERDE/
├── GASTOS/
│   ├── backend/          # API REST con Node.js y Express
│   │   ├── server.js
│   │   ├── package.json
│   │   ├── .env         # Variables de entorno (no incluido en git)
│   │   └── .env.example # Plantilla de configuración
│   └── frontend/         # Interfaz React
│       ├── src/
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   └── index.css
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
└── README.md
```

## Configuración Inicial

### 1. Configurar variables de entorno del Backend

Crea un archivo `.env` en la carpeta `backend/` basándote en `.env.example`:

```bash
cd GASTOS/backend
cp .env.example .env
```

#### Opción A: Conexión Directa a PostgreSQL

Edita el archivo `.env` para conexión directa:

```env
# Configuración de PostgreSQL
DB_HOST=tu_host_postgresql
DB_PORT=5432
DB_NAME=nombre_base_datos
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña

# Desactivar túnel SSH
USE_SSH=false

# Puerto del servidor
PORT=3001
```

#### Opción B: Conexión a través de Túnel SSH

Si tu base de datos está en un servidor remoto y necesitas conectarte por SSH:

```env
# Configuración de PostgreSQL (en el servidor remoto)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nombre_base_datos
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña

# Activar túnel SSH
USE_SSH=true

# Configuración SSH
SSH_HOST=tu-servidor-remoto.com
SSH_PORT=22
SSH_USER=tu_usuario_ssh

# Autenticación SSH (elegir UNO):
# Opción 1: Clave privada (RECOMENDADO)
SSH_PRIVATE_KEY_PATH=C:/Users/tu_usuario/.ssh/id_rsa
# Opción 2: Contraseña
# SSH_PASSWORD=tu_contraseña_ssh

# Puerto local para el túnel
LOCAL_PORT=5433

# Puerto del servidor
PORT=3001
```

**Nota sobre rutas en Windows:**
- Usa `/` en lugar de `\` en las rutas
- Ejemplo: `C:/Users/diego/.ssh/id_rsa`

### 2. Instalar dependencias del Backend

```bash
cd GASTOS/backend
npm install
```

### 3. Iniciar el servidor Backend

```bash
npm start
```

El servidor mostrará mensajes indicando si se estableció el túnel SSH o si se conectó directamente:
- Con SSH: `✓ Túnel SSH establecido`
- Directo: `✓ Conectado a PostgreSQL`

El servidor estará corriendo en `http://localhost:3001`

### 4. Instalar dependencias del Frontend (en otra terminal)

```bash
cd GASTOS/frontend
npm install
```

### 5. Iniciar la aplicación Frontend

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura de la Base de Datos

La aplicación usa la tabla `granja_verde` en PostgreSQL con la siguiente estructura:

| Campo        | Tipo                      | Nullable |
|--------------|---------------------------|----------|
| id_gasto     | bigint (PK)              | NO       |
| fecha        | date                      | NO       |
| monto        | numeric                   | NO       |
| moneda       | text                      | NO       |
| metodo_pago  | text                      | NO       |
| categoria    | text                      | NO       |
| estado       | text                      | NO       |
| creado_en    | timestamp with time zone | NO       |

## Características

- Agregar gastos con fecha, monto, moneda, método de pago, categoría y estado
- Soporte para múltiples monedas (USD, EUR, ARS, UYU)
- Métodos de pago: Efectivo, Tarjeta de Crédito, Tarjeta de Débito, Transferencia, Mercado Pago
- Categorías: Alimentación, Transporte, Servicios, Insumos, Equipamiento, Mantenimiento, Personal, Otros
- Estados: Pendiente, Pagado, Cancelado
- Ver lista de todos los gastos ordenados por fecha
- Eliminar gastos
- Calcular total de gastos
- Base de datos PostgreSQL persistente
- Conexión mediante túnel SSH automático o directa

## API Endpoints

- `GET /api/gastos` - Obtener todos los gastos
- `POST /api/gastos` - Crear un nuevo gasto
- `PUT /api/gastos/:id` - Actualizar un gasto
- `DELETE /api/gastos/:id` - Eliminar un gasto

## Tecnologías Utilizadas

**Backend:**
- Node.js
- Express
- PostgreSQL (pg)
- tunnel-ssh (para conexiones SSH)
- dotenv
- CORS

**Frontend:**
- React
- Vite
- CSS3

## Seguridad

- Las credenciales de la base de datos se almacenan en variables de entorno
- El archivo `.env` NO debe incluirse en el control de versiones
- Asegúrate de agregar `.env` a tu `.gitignore`
- Usa autenticación SSH con clave privada en lugar de contraseña cuando sea posible

## Solución de Problemas

### Error de conexión SSH
- Verifica que la ruta a tu clave privada sea correcta
- En Windows, usa `/` en lugar de `\` en las rutas
- Asegúrate de que el servidor SSH esté accesible

### Error de conexión PostgreSQL
- Verifica que las credenciales sean correctas
- Si usas SSH, asegúrate de que `DB_HOST` sea `localhost` en el `.env`
- Revisa que el puerto de PostgreSQL sea el correcto (por defecto 5432)
