import { useState, useEffect } from 'react'

const API_URL = `http://${window.location.hostname}:3001/api/cobros`

function Cobros() {
  // Estado principal
  const [clientesConDeuda, setClientesConDeuda] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [ventasPendientes, setVentasPendientes] = useState([])
  const [enums, setEnums] = useState({ METODOS_PAGO: [], MODOS_PAGO: [] })

  // Estado del wizard
  const [paso, setPaso] = useState(1)

  // Datos del pago
  const [paymentLines, setPaymentLines] = useState([])
  const [lineaActual, setLineaActual] = useState({
    monto: '',
    metodo_pago: 'EFECTIVO',
    referencia: '',
    nota: '',
  })
  const [modoPago, setModoPago] = useState('PARTIAL')

  // UI states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    cargarClientesConDeuda()
  }, [])

  const cargarClientesConDeuda = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/pending-clients`)
      const data = await response.json()
      setClientesConDeuda(data.data || [])
      setEnums(data.enums || { METODOS_PAGO: [], MODOS_PAGO: [] })
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      setError('Error al cargar clientes con deuda')
    } finally {
      setLoading(false)
    }
  }

  const cargarVentasPendientes = async (idCliente) => {
    try {
      const response = await fetch(`${API_URL}/client/${idCliente}/ventas`)
      const data = await response.json()
      setVentasPendientes(data.data || [])
    } catch (error) {
      console.error('Error al cargar ventas:', error)
    }
  }

  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente)
    await cargarVentasPendientes(cliente.id_cliente)
    setPaso(2)
  }

  const calcularTotalPago = () => {
    return paymentLines.reduce((sum, line) => sum + (line.monto || 0), 0)
  }

  const agregarLineaPago = () => {
    if (!lineaActual.monto || parseFloat(lineaActual.monto) <= 0) {
      alert('Debe ingresar un monto válido')
      return
    }

    const nuevaLinea = {
      monto: parseFloat(lineaActual.monto),
      metodo_pago: lineaActual.metodo_pago,
      referencia: lineaActual.referencia || null,
      nota: lineaActual.nota || null,
    }

    setPaymentLines([...paymentLines, nuevaLinea])
    setLineaActual({
      monto: '',
      metodo_pago: 'EFECTIVO',
      referencia: '',
      nota: '',
    })
  }

  const eliminarLineaPago = (index) => {
    setPaymentLines(paymentLines.filter((_, i) => i !== index))
  }

  const handleLineaChange = (e) => {
    const { name, value } = e.target
    if (name === 'monto') {
      setLineaActual({ ...lineaActual, [name]: value === '' ? '' : value })
    } else {
      setLineaActual({ ...lineaActual, [name]: value })
    }
  }

  const irAPaso3 = () => {
    if (paymentLines.length === 0) {
      alert('Debe agregar al menos una linea de pago')
      return
    }
    setPaso(3)
  }

  const volverAPaso1 = () => {
    setPaso(1)
    setClienteSeleccionado(null)
    setVentasPendientes([])
    setPaymentLines([])
  }

  const volverAPaso2 = () => {
    setPaso(2)
  }

  const registrarPago = async () => {
    setLoading(true)
    setError(null)

    try {
      const payload = {
        ID_CLIENTE: parseInt(clienteSeleccionado.id_cliente),
        MODE: modoPago,
        PAYMENT_LINES: paymentLines,
      }

      const response = await fetch(`${API_URL}/register-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        setResultado(data.payload)
        setPaso(4)
        // Recargar lista de clientes
        cargarClientesConDeuda()
      } else {
        setError(data.error || 'Error al registrar pago')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error de conexion al servidor')
    } finally {
      setLoading(false)
    }
  }

  const nuevoCobro = () => {
    setClienteSeleccionado(null)
    setVentasPendientes([])
    setPaymentLines([])
    setLineaActual({
      monto: '',
      metodo_pago: 'EFECTIVO',
      referencia: '',
      nota: '',
    })
    setModoPago('PARTIAL')
    setResultado(null)
    setError(null)
    setPaso(1)
    cargarClientesConDeuda()
  }

  const totalPago = calcularTotalPago()
  const deudaCliente = clienteSeleccionado ? parseFloat(clienteSeleccionado.saldo_pendiente) : 0

  return (
    <div className="container">
      <h1>Cobros - Granja Verde</h1>

      {/* Indicador de pasos */}
      <div className="wizard-steps">
        <div className={`step ${paso >= 1 ? 'active' : ''}`}>1. Cliente</div>
        <div className={`step ${paso >= 2 ? 'active' : ''}`}>2. Pago</div>
        <div className={`step ${paso >= 3 ? 'active' : ''}`}>3. Confirmar</div>
        <div className={`step ${paso >= 4 ? 'active' : ''}`}>4. Resultado</div>
      </div>

      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ===== PASO 1: Seleccionar Cliente ===== */}
      {paso === 1 && (
        <div className="form-gastos">
          <h3>Paso 1: Seleccionar Cliente con Deuda</h3>

          {loading ? (
            <p>Cargando...</p>
          ) : clientesConDeuda.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No hay clientes con deuda pendiente
            </div>
          ) : (
            <table className="table-detalle">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Ventas Pendientes</th>
                  <th>Saldo Pendiente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientesConDeuda.map((cliente) => (
                  <tr key={cliente.id_cliente}>
                    <td>{cliente.cliente_nombre}</td>
                    <td style={{ textAlign: 'center' }}>{cliente.ventas_pendientes}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#f44336' }}>
                      ${parseFloat(cliente.saldo_pendiente).toFixed(2)}
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        onClick={() => seleccionarCliente(cliente)}
                      >
                        Cobrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== PASO 2: Agregar Lineas de Pago ===== */}
      {paso === 2 && clienteSeleccionado && (
        <div className="form-gastos">
          <h3>Paso 2: Registrar Pago</h3>

          {/* Info del cliente */}
          <div className="detalle-section" style={{ marginBottom: '20px' }}>
            <p><strong>Cliente:</strong> {clienteSeleccionado.cliente_nombre}</p>
            <p><strong>Deuda Total:</strong> <span style={{ color: '#f44336', fontWeight: 'bold' }}>${deudaCliente.toFixed(2)}</span></p>
          </div>

          {/* Ventas pendientes */}
          {ventasPendientes.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Ventas Pendientes</h4>
              <table className="table-detalle">
                <thead>
                  <tr>
                    <th>ID Venta</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPendientes.map((venta) => (
                    <tr key={venta.ID_VENTA}>
                      <td>{venta.ID_VENTA}</td>
                      <td>{new Date(venta.FECHA_VENTA).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>${parseFloat(venta.TOTAL).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: '#f44336' }}>${parseFloat(venta.SALDO_PENDIENTE).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modo de pago */}
          <div className="form-row">
            <div className="form-field">
              <label>Modo de Pago</label>
              <select
                value={modoPago}
                onChange={(e) => setModoPago(e.target.value)}
              >
                <option value="PARTIAL">Pago Parcial</option>
                <option value="FULL">Pago Total</option>
              </select>
            </div>
          </div>

          {/* Agregar linea de pago */}
          <div className="form-row">
            <div className="form-field">
              <label>Monto *</label>
              <input
                type="number"
                name="monto"
                placeholder="0.00"
                value={lineaActual.monto}
                onChange={handleLineaChange}
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-field">
              <label>Metodo de Pago *</label>
              <select
                name="metodo_pago"
                value={lineaActual.metodo_pago}
                onChange={handleLineaChange}
              >
                {enums.METODOS_PAGO.map((metodo) => (
                  <option key={metodo} value={metodo}>{metodo}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Referencia</label>
              <input
                type="text"
                name="referencia"
                placeholder="Opcional"
                value={lineaActual.referencia}
                onChange={handleLineaChange}
              />
            </div>
            <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={agregarLineaPago}
                className="btn-secondary"
                style={{ width: '100%' }}
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Lista de lineas agregadas */}
          {paymentLines.length > 0 && (
            <div className="items-list">
              <h4>Lineas de Pago ({paymentLines.length})</h4>
              <table className="table-detalle">
                <thead>
                  <tr>
                    <th>Monto</th>
                    <th>Metodo</th>
                    <th>Referencia</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLines.map((line, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'right' }}>${line.monto.toFixed(2)}</td>
                      <td>{line.metodo_pago}</td>
                      <td>{line.referencia || '-'}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => eliminarLineaPago(idx)}
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
                    <td style={{ textAlign: 'right' }}><strong>${totalPago.toFixed(2)}</strong></td>
                    <td colSpan="3"><strong>TOTAL A PAGAR</strong></td>
                  </tr>
                </tfoot>
              </table>

              {totalPago > deudaCliente && (
                <div className="error-box" style={{ marginTop: '10px' }}>
                  El monto excede la deuda del cliente
                </div>
              )}
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
              disabled={paymentLines.length === 0 || totalPago > deudaCliente}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* ===== PASO 3: Confirmar ===== */}
      {paso === 3 && clienteSeleccionado && (
        <div className="form-gastos">
          <h3>Paso 3: Confirmar Pago</h3>

          <div className="detalle-venta">
            <div className="detalle-section">
              <h4>Datos del Pago</h4>
              <p><strong>Cliente:</strong> {clienteSeleccionado.cliente_nombre}</p>
              <p><strong>Deuda Actual:</strong> ${deudaCliente.toFixed(2)}</p>
              <p><strong>Modo:</strong> {modoPago === 'FULL' ? 'Pago Total' : 'Pago Parcial'}</p>
            </div>

            <div className="detalle-section">
              <h4>Detalle del Pago</h4>
              <table className="table-detalle">
                <thead>
                  <tr>
                    <th>Monto</th>
                    <th>Metodo</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLines.map((line, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'right' }}>${line.monto.toFixed(2)}</td>
                      <td>{line.metodo_pago}</td>
                      <td>{line.referencia || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ textAlign: 'right' }}><strong>${totalPago.toFixed(2)}</strong></td>
                    <td colSpan="2"><strong>TOTAL</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="detalle-section">
              <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '4px' }}>
                <p style={{ margin: '5px 0' }}><strong>Deuda Actual:</strong> ${deudaCliente.toFixed(2)}</p>
                <p style={{ margin: '5px 0' }}><strong>Pago:</strong> ${totalPago.toFixed(2)}</p>
                <p style={{ margin: '5px 0', color: (deudaCliente - totalPago) > 0 ? '#f44336' : '#4caf50' }}>
                  <strong>Deuda Restante:</strong> ${(deudaCliente - totalPago).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
            <button
              type="button"
              onClick={volverAPaso2}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Volver
            </button>
            <button
              type="button"
              onClick={registrarPago}
              className="btn-confirmar"
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </div>
      )}

      {/* ===== PASO 4: Resultado ===== */}
      {paso === 4 && resultado && (
        <div className="form-gastos">
          <h3 style={{ color: '#4caf50' }}>Pago Registrado Exitosamente</h3>

          <div className="detalle-venta">
            <div className="detalle-section">
              <h4>Resumen</h4>
              <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '4px' }}>
                <p style={{ margin: '10px 0' }}><strong>Total Pagado:</strong> ${resultado.total_pagado.toFixed(2)}</p>
                <p style={{ margin: '10px 0' }}><strong>Total Aplicado:</strong> ${resultado.total_aplicado.toFixed(2)}</p>
                <p style={{ margin: '10px 0' }}><strong>Deuda Anterior:</strong> ${resultado.deuda_anterior.toFixed(2)}</p>
                <p style={{ margin: '10px 0', fontSize: '1.2em' }}>
                  <strong>Nueva Deuda:</strong>{' '}
                  <span style={{ color: resultado.deuda_nueva > 0 ? '#f44336' : '#4caf50' }}>
                    ${resultado.deuda_nueva.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>

            <div className="detalle-section">
              <h4>Transacciones Creadas</h4>
              <table className="table-detalle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Monto</th>
                    <th>Metodo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.transacciones.map((t) => (
                    <tr key={t.ID_ING}>
                      <td>{t.ID_ING}</td>
                      <td style={{ textAlign: 'right' }}>${t.monto.toFixed(2)}</td>
                      <td>{t.metodo_pago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="detalle-section">
              <h4>Ventas Afectadas</h4>
              <table className="table-detalle">
                <thead>
                  <tr>
                    <th>ID Venta</th>
                    <th>Saldo Anterior</th>
                    <th>Aplicado</th>
                    <th>Nuevo Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.ventas_afectadas.map((v) => (
                    <tr key={v.ID_VENTA}>
                      <td>{v.ID_VENTA}</td>
                      <td style={{ textAlign: 'right' }}>${v.saldo_anterior.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: '#4caf50' }}>-${v.monto_aplicado.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>${v.saldo_nuevo.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: '25px' }}>
            <button
              type="button"
              onClick={nuevoCobro}
              className="btn-confirmar"
              style={{ width: '100%' }}
            >
              Nuevo Cobro
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cobros
