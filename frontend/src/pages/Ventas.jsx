import { useState, useEffect } from 'react'

const API_URL = `http://${window.location.hostname}:3001/api/ventas`

function Ventas() {
  // Catálogos y enums
  const [catalogos, setCatalogos] = useState({ clientes: [], productos: [], enums: {} })

  // Estado del wizard (5 pasos)
  const [paso, setPaso] = useState(1)

  // Datos del formulario (draft en memoria)
  const [formData, setFormData] = useState({
    ID_CLIENTE: '',
    CANAL: 'POS',
    ESTADO_PREP: 'PENDIENTE',
    ITEMS: [],
    // Datos de pago
    ABONADO: 0,
    METODO_PAGO: 'EFECTIVO',
    REFERENCIA: '',
    NOTA: '',
    clienteAbona: false, // Para paso 3
  })

  // Item actual para agregar
  const [itemActual, setItemActual] = useState({
    ITEM: '',
    CANTIDAD: '',
    SUBTOTAL: '',
    UMD: 0,
    ITEM_DESCRIPCION: '',
  })

  // UI states
  const [filtroCliente, setFiltroCliente] = useState('')
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false)
  const [filtroProducto, setFiltroProducto] = useState('')
  const [mostrarListaProductos, setMostrarListaProductos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarCatalogos()
  }, [])

  const cargarCatalogos = async () => {
    try {
      const response = await fetch(`${API_URL}/catalogos`)
      const data = await response.json()
      setCatalogos(data)
    } catch (error) {
      console.error('Error al cargar catálogos:', error)
    }
  }

  // ===== Helpers =====

  const calcularTotal = () => {
    return formData.ITEMS.reduce((sum, item) => sum + (item.SUBTOTAL || 0), 0)
  }

  const obtenerNombreCliente = () => {
    const cliente = catalogos.clientes.find(c => c.id === formData.ID_CLIENTE)
    return cliente ? cliente.label : 'Cliente no encontrado'
  }

  const resetForm = () => {
    setFormData({
      ID_CLIENTE: '',
      CANAL: 'POS',
      ESTADO_PREP: 'PENDIENTE',
      ITEMS: [],
      ABONADO: 0,
      METODO_PAGO: 'EFECTIVO',
      REFERENCIA: '',
      NOTA: '',
      clienteAbona: false,
    })
    setItemActual({
      ITEM: '',
      CANTIDAD: '',
      SUBTOTAL: '',
      UMD: 0,
      ITEM_DESCRIPCION: '',
    })
    setFiltroCliente('')
    setFiltroProducto('')
    setPaso(1)
    setError(null)
  }

  // ===== Validaciones =====

  const validarPaso1 = () => {
    if (!formData.ID_CLIENTE) {
      alert('Debe seleccionar un cliente')
      return false
    }
    return true
  }

  const validarPaso2 = () => {
    if (formData.ITEMS.length === 0) {
      alert('Debe agregar al menos un producto')
      return false
    }
    return true
  }

  // ===== Navegación entre pasos =====

  const irAPaso2 = () => {
    if (validarPaso1()) {
      setPaso(2)
    }
  }

  const irAPaso3 = () => {
    if (validarPaso2()) {
      setPaso(3)
    }
  }

  const irAPaso4 = () => {
    setPaso(4)
  }

  const volverAPaso1 = () => {
    setPaso(1)
  }

  const volverAPaso2 = () => {
    setPaso(2)
  }

  const volverAPaso3 = () => {
    setPaso(3)
  }

  // ===== Handlers de campos =====

  const handleChange = (e) => {
    const { name, value } = e.target
    // Convertir a número para campos numéricos
    if (name === 'ABONADO') {
      setFormData({ ...formData, [name]: value === '' ? 0 : parseFloat(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleFiltroCliente = (e) => {
    setFiltroCliente(e.target.value)
    setMostrarListaClientes(true)
  }

  const seleccionarCliente = (cliente) => {
    setFormData({ ...formData, ID_CLIENTE: cliente.id })
    setFiltroCliente(cliente.label)
    setMostrarListaClientes(false)
  }

  const handleFiltroProducto = (e) => {
    setFiltroProducto(e.target.value)
    setMostrarListaProductos(true)
  }

  const seleccionarProducto = (producto) => {
    setItemActual({
      ...itemActual,
      ITEM: producto.item,
      UMD: producto.umd,
      ITEM_DESCRIPCION: producto.label,
    })
    setFiltroProducto(producto.label)
    setMostrarListaProductos(false)
  }

  const handleItemChange = (e) => {
    const { name, value } = e.target
    setItemActual({ ...itemActual, [name]: value })
  }

  const agregarItem = () => {
    if (!itemActual.ITEM) {
      alert('Debe seleccionar un producto')
      return
    }
    if (!itemActual.CANTIDAD || parseInt(itemActual.CANTIDAD) <= 0) {
      alert('Debe ingresar una cantidad válida (entero positivo)')
      return
    }
    if (!itemActual.SUBTOTAL || parseFloat(itemActual.SUBTOTAL) <= 0) {
      alert('Debe ingresar un monto válido')
      return
    }

    const cantidad = parseInt(itemActual.CANTIDAD)
    const subtotal = Math.round(parseFloat(itemActual.SUBTOTAL) * 100) / 100
    const cantidadUnidades = cantidad * itemActual.UMD

    const nuevoItem = {
      ITEM: itemActual.ITEM,
      CANTIDAD: cantidad,
      SUBTOTAL: subtotal,
      UMD: itemActual.UMD,
      ITEM_DESCRIPCION: itemActual.ITEM_DESCRIPCION,
      CANTIDAD_UNIDADES: cantidadUnidades,
    }

    setFormData({
      ...formData,
      ITEMS: [...formData.ITEMS, nuevoItem],
    })

    setItemActual({
      ITEM: '',
      CANTIDAD: '',
      SUBTOTAL: '',
      UMD: 0,
      ITEM_DESCRIPCION: '',
    })
    setFiltroProducto('')
  }

  const eliminarItem = (index) => {
    setFormData({
      ...formData,
      ITEMS: formData.ITEMS.filter((_, i) => i !== index),
    })
  }

  // Paso 3: ¿El cliente abona?
  const responderAbona = (abona) => {
    if (abona) {
      setFormData({ ...formData, clienteAbona: true, ABONADO: calcularTotal() })
    } else {
      setFormData({ ...formData, clienteAbona: false, ABONADO: 0 })
    }
    irAPaso4()
  }

  // ===== Submit final =====

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const total = calcularTotal()

      // Validar abonado <= total
      if (formData.ABONADO > total) {
        alert('El monto abonado no puede ser mayor al total')
        setLoading(false)
        return
      }

      const payload = {
        ID_CLIENTE: formData.ID_CLIENTE,
        CANAL: formData.CANAL,
        ITEMS: formData.ITEMS.map(item => ({
          ITEM: item.ITEM,
          CANTIDAD: item.CANTIDAD,
          SUBTOTAL: item.SUBTOTAL,
        })),
      }

      // Solo agregar ESTADO_PREP si es PEDIDO
      if (formData.CANAL === 'PEDIDO') {
        payload.ESTADO_PREP = formData.ESTADO_PREP
      }

      // Agregar datos de pago si hay abono
      if (formData.ABONADO > 0) {
        payload.ABONADO = formData.ABONADO
        payload.METODO_PAGO = formData.METODO_PAGO
        if (formData.REFERENCIA) payload.REFERENCIA = formData.REFERENCIA
        if (formData.NOTA) payload.NOTA = formData.NOTA
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Venta creada exitosamente. ID: ${result.ID_VENTA}`)
        resetForm()
      } else {
        const errorData = await response.json()
        setError(errorData.errors ? errorData.errors.join('\n') : errorData.error)
      }
    } catch (err) {
      console.error('Error al crear venta:', err)
      setError('Error de conexión al servidor')
    } finally {
      setLoading(false)
    }
  }

  const eliminarVenta = () => {
    if (confirm('¿Está seguro de cancelar esta venta? Se perderán todos los datos.')) {
      resetForm()
    }
  }

  // ===== Filtros de autocompletado =====

  const clientesFiltrados = catalogos.clientes.filter(cliente =>
    cliente.label && cliente.label.toLowerCase().includes(filtroCliente.toLowerCase())
  )

  const productosFiltrados = catalogos.productos.filter(producto =>
    producto.label && producto.label.toLowerCase().includes(filtroProducto.toLowerCase())
  )

  const total = calcularTotal()
  const saldoPendiente = total - formData.ABONADO

  // ===== Render =====

  return (
    <div className="container">
      <h1>Nueva Venta - Granja Verde</h1>

      {/* Indicador de pasos */}
      <div className="wizard-steps">
        <div className={`step ${paso >= 1 ? 'active' : ''}`}>1. Datos</div>
        <div className={`step ${paso >= 2 ? 'active' : ''}`}>2. Items</div>
        <div className={`step ${paso >= 3 ? 'active' : ''}`}>3. Pago</div>
        <div className={`step ${paso >= 4 ? 'active' : ''}`}>4. Confirmar</div>
      </div>

      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ===== PASO 1: Datos del Cliente y Canal ===== */}
      {paso === 1 && (
        <div className="form-gastos">
          <h3>Paso 1: Datos de la Venta</h3>

          <div className="form-row">
            <div className="form-field">
              <label>Cliente *</label>
              <div className="autocomplete-container">
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre..."
                  value={filtroCliente}
                  onChange={handleFiltroCliente}
                  onFocus={() => setMostrarListaClientes(true)}
                  required
                />
                {mostrarListaClientes && (
                  <div className="autocomplete-list">
                    {clientesFiltrados.slice(0, 10).map(cliente => (
                      <div
                        key={cliente.id}
                        className="autocomplete-item"
                        onClick={() => seleccionarCliente(cliente)}
                      >
                        {cliente.label}
                      </div>
                    ))}
                    {clientesFiltrados.length === 0 && (
                      <div className="autocomplete-item">No se encontraron clientes</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-field">
              <label>Canal *</label>
              <select
                name="CANAL"
                value={formData.CANAL}
                onChange={handleChange}
                required
              >
                <option value="POS">POS (Venta directa)</option>
                <option value="PEDIDO">PEDIDO (A preparar/entregar)</option>
              </select>
            </div>
          </div>

          {/* Estado de pedido solo si Canal = PEDIDO */}
          {formData.CANAL === 'PEDIDO' && (
            <div className="form-row">
              <div className="form-field">
                <label>Estado del Pedido *</label>
                <select
                  name="ESTADO_PREP"
                  value={formData.ESTADO_PREP}
                  onChange={handleChange}
                  required
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PREPARADO">Preparado</option>
                  <option value="ENTREGADO">Entregado</option>
                </select>
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={irAPaso2}
              className="btn-confirmar"
            >
              Continuar a Items
            </button>
          </div>
        </div>
      )}

      {/* ===== PASO 2: Agregar Items ===== */}
      {paso === 2 && (
        <div className="form-gastos">
          <h3>Paso 2: Agregar Productos</h3>

          <div className="form-row">
            <div className="form-field" style={{ flex: 2 }}>
              <label>Producto *</label>
              <div className="autocomplete-container">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={filtroProducto}
                  onChange={handleFiltroProducto}
                  onFocus={() => setMostrarListaProductos(true)}
                />
                {mostrarListaProductos && (
                  <div className="autocomplete-list">
                    {productosFiltrados.slice(0, 10).map(producto => (
                      <div
                        key={producto.item}
                        className="autocomplete-item"
                        onClick={() => seleccionarProducto(producto)}
                      >
                        {producto.label} (Empaque: {producto.umd})
                      </div>
                    ))}
                    {productosFiltrados.length === 0 && (
                      <div className="autocomplete-item">No se encontraron productos</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {itemActual.ITEM && (
              <div className="form-field">
                <label>Empaque (UMD)</label>
                <input
                  type="text"
                  value={itemActual.UMD}
                  disabled
                  style={{ background: '#f0f0f0' }}
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Cantidad (entero) *</label>
              <input
                type="number"
                name="CANTIDAD"
                placeholder="1, 2, 3..."
                value={itemActual.CANTIDAD}
                onChange={handleItemChange}
                min="1"
                step="1"
              />
            </div>

            <div className="form-field">
              <label>Monto ($) *</label>
              <input
                type="number"
                name="SUBTOTAL"
                placeholder="0.00"
                value={itemActual.SUBTOTAL}
                onChange={handleItemChange}
                step="0.01"
                min="0"
              />
            </div>

            {itemActual.ITEM && itemActual.CANTIDAD && (
              <div className="form-field">
                <label>Total Unidades</label>
                <input
                  type="text"
                  value={`${parseInt(itemActual.CANTIDAD || 0) * itemActual.UMD} unidades`}
                  disabled
                  style={{ background: '#f0f0f0' }}
                />
              </div>
            )}

            <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" onClick={agregarItem} className="btn-secondary" style={{ width: '100%' }}>
                Agregar
              </button>
            </div>
          </div>

          {/* Lista de items agregados */}
          {formData.ITEMS.length > 0 && (
            <div className="items-list">
              <h4>Items agregados ({formData.ITEMS.length})</h4>
              <table className="table-detalle">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Unidades</th>
                    <th>Monto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.ITEMS.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.ITEM_DESCRIPCION}</td>
                      <td>{item.CANTIDAD}</td>
                      <td>{item.CANTIDAD_UNIDADES}</td>
                      <td>${item.SUBTOTAL.toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => eliminarItem(idx)}
                          className="btn-eliminar-small"
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3"><strong>TOTAL</strong></td>
                    <td><strong>${total.toFixed(2)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={volverAPaso1}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Volver
            </button>
            <button
              type="button"
              onClick={irAPaso3}
              className="btn-confirmar"
              style={{ flex: 2 }}
              disabled={formData.ITEMS.length === 0}
            >
              Continuar a Pago
            </button>
          </div>
        </div>
      )}

      {/* ===== PASO 3: Pregunta de Pago ===== */}
      {paso === 3 && (
        <div className="form-gastos">
          <h3>Paso 3: Pago</h3>

          <div className="payment-prompt">
            <p style={{ fontSize: '1.2em', marginBottom: '20px' }}>
              Total de la venta: <strong>${total.toFixed(2)}</strong>
            </p>
            <p style={{ fontSize: '1.1em', marginBottom: '30px' }}>
              ¿El cliente abona esta venta?
            </p>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => responderAbona(true)}
                className="btn-confirmar"
                style={{ minWidth: '150px', padding: '15px 30px' }}
              >
                SI
              </button>
              <button
                type="button"
                onClick={() => responderAbona(false)}
                className="btn-secondary"
                style={{ minWidth: '150px', padding: '15px 30px' }}
              >
                NO
              </button>
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            <button
              type="button"
              onClick={volverAPaso2}
              className="btn-secondary"
            >
              Volver a Items
            </button>
          </div>
        </div>
      )}

      {/* ===== PASO 4: Resumen y Confirmación ===== */}
      {paso === 4 && (
        <div className="form-gastos">
          <h3>Paso 4: Resumen de la Venta</h3>

          <div className="detalle-venta">
            {/* Datos del Cliente */}
            <div className="detalle-section">
              <h4>Datos del Cliente</h4>
              <p><strong>Cliente:</strong> {obtenerNombreCliente()}</p>
              <p><strong>Canal:</strong> {formData.CANAL === 'POS' ? 'Venta Directa (POS)' : 'Pedido'}</p>
              {formData.CANAL === 'PEDIDO' && (
                <p><strong>Estado del Pedido:</strong> {formData.ESTADO_PREP}</p>
              )}
            </div>

            {/* Detalle de Items */}
            <div className="detalle-section">
              <h4>Detalle de Productos</h4>
              <table className="table-detalle">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Unidades</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.ITEMS.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.ITEM_DESCRIPCION}</td>
                      <td>{item.CANTIDAD}</td>
                      <td>{item.CANTIDAD_UNIDADES}</td>
                      <td>${item.SUBTOTAL.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen de Pago */}
            <div className="detalle-section">
              <h4>Resumen de Pago</h4>
              <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '4px' }}>
                <p style={{ margin: '5px 0' }}><strong>Total:</strong> ${total.toFixed(2)}</p>
                <p style={{ margin: '5px 0' }}><strong>Abonado:</strong> ${formData.ABONADO.toFixed(2)}</p>
                <p style={{ margin: '5px 0', color: saldoPendiente > 0 ? '#f44336' : '#4caf50' }}>
                  <strong>Saldo Pendiente:</strong> ${saldoPendiente.toFixed(2)}
                </p>
              </div>

              {/* Campos de pago si el cliente abona */}
              {formData.clienteAbona && (
                <div style={{ marginTop: '20px' }}>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Monto Abonado ($)</label>
                      <input
                        type="number"
                        name="ABONADO"
                        value={formData.ABONADO}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        max={total}
                      />
                    </div>

                    <div className="form-field">
                      <label>Método de Pago *</label>
                      <select
                        name="METODO_PAGO"
                        value={formData.METODO_PAGO}
                        onChange={handleChange}
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="DEBITO">Débito</option>
                        <option value="CREDITO">Crédito</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="OTROS">Otros</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Referencia (opcional)</label>
                      <input
                        type="text"
                        name="REFERENCIA"
                        placeholder="Número de transacción, etc."
                        value={formData.REFERENCIA}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-field">
                      <label>Nota (opcional)</label>
                      <input
                        type="text"
                        name="NOTA"
                        placeholder="Observaciones..."
                        value={formData.NOTA}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
            <button
              type="button"
              onClick={eliminarVenta}
              className="btn-eliminar"
              style={{ flex: 1 }}
            >
              Eliminar
            </button>
            <button
              type="button"
              onClick={volverAPaso2}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Editar Items
            </button>
            <button
              type="button"
              onClick={volverAPaso3}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Editar Pago
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-confirmar"
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Confirmar Venta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Ventas
