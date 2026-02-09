import { useState, useEffect, useCallback } from 'react'

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api/gastos`

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'DEBITO', label: 'Débito' },
  { value: 'OTRO', label: 'Otro' }
]

function PagoObligaciones() {
  const [obligaciones, setObligaciones] = useState([])
  const [selectedObligacion, setSelectedObligacion] = useState(null)
  const [historial, setHistorial] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentLines, setPaymentLines] = useState([{ metodo_pago: 'EFECTIVO', monto: '' }])

  // Modal de bonificación
  const [showBonificacionModal, setShowBonificacionModal] = useState(false)
  const [selectedPago, setSelectedPago] = useState(null)
  const [montoBonificacion, setMontoBonificacion] = useState('')

  // Filtros
  const [filtroMoneda, setFiltroMoneda] = useState('')

  useEffect(() => {
    cargarObligaciones()
  }, [])

  const cargarObligaciones = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/obligaciones/pendientes`)
      const data = await response.json()
      setObligaciones(data)
    } catch (error) {
      console.error('Error al cargar obligaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const cargarHistorial = async (idGasto) => {
    try {
      const response = await fetch(`${API_URL}/obligaciones/${idGasto}/historial`)
      const data = await response.json()
      setHistorial(data)
    } catch (error) {
      console.error('Error al cargar historial:', error)
    }
  }

  const handleSelectObligacion = (obligacion) => {
    setSelectedObligacion(obligacion)
    cargarHistorial(obligacion.ID_GASTO)
  }

  const handleOpenPaymentModal = () => {
    if (!selectedObligacion) {
      alert('Seleccione una obligación primero')
      return
    }
    // Pre-llenar con el saldo pendiente
    setPaymentLines([{
      metodo_pago: 'EFECTIVO',
      monto: selectedObligacion.SALDO_PENDIENTE
    }])
    setShowPaymentModal(true)
  }

  const calcularSumaPagos = useCallback(() => {
    return paymentLines.reduce((sum, line) => sum + (parseFloat(line.monto) || 0), 0)
  }, [paymentLines])

  const handlePaymentLineChange = (index, field, value) => {
    const newLines = [...paymentLines]
    newLines[index][field] = value
    setPaymentLines(newLines)
  }

  const addPaymentLine = () => {
    setPaymentLines([...paymentLines, { metodo_pago: 'EFECTIVO', monto: '' }])
  }

  const removePaymentLine = (index) => {
    if (paymentLines.length > 1) {
      setPaymentLines(paymentLines.filter((_, i) => i !== index))
    }
  }

  const handleConfirmPayment = async () => {
    if (!selectedObligacion) return

    const sumaPagos = calcularSumaPagos()
    const saldoPendiente = parseFloat(selectedObligacion.SALDO_PENDIENTE)

    // Validaciones
    if (sumaPagos <= 0) {
      alert('El monto a pagar debe ser mayor a 0')
      return
    }

    if (sumaPagos > saldoPendiente) {
      alert(`El monto a pagar (${sumaPagos}) excede el saldo pendiente (${saldoPendiente})`)
      return
    }

    for (let i = 0; i < paymentLines.length; i++) {
      if (!paymentLines[i].monto || parseFloat(paymentLines[i].monto) <= 0) {
        alert(`Línea de pago ${i + 1}: monto debe ser mayor a 0`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      const payload = {
        id_gasto: selectedObligacion.ID_GASTO,
        paymentLines: paymentLines.map(l => ({
          metodo_pago: l.metodo_pago,
          monto: parseFloat(l.monto)
        }))
      }

      const response = await fetch(`${API_URL}/obligaciones/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido')
      }

      alert(result.message)
      setShowPaymentModal(false)
      setSelectedObligacion(null)
      setHistorial([])
      cargarObligaciones()

    } catch (error) {
      console.error('Error al registrar pago:', error)
      alert('Error al registrar pago: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectPagoHistorial = (pago) => {
    setSelectedPago(pago)
    setMontoBonificacion('')
    setShowBonificacionModal(true)
  }

  const handleConfirmBonificacion = async () => {
    if (!selectedPago) return

    const monto = parseFloat(montoBonificacion)

    // Validaciones
    if (!monto || monto <= 0) {
      alert('El monto de bonificación debe ser mayor a 0')
      return
    }

    if (monto > parseFloat(selectedPago.MONTO_APLICADO)) {
      alert(`La bonificación (${monto}) no puede exceder el monto del pago (${selectedPago.MONTO_APLICADO})`)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        monto_bonificacion: monto
      }

      const response = await fetch(`${API_URL}/pagos/${selectedPago.ID_EG}/bonificacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido')
      }

      alert(result.message)
      setShowBonificacionModal(false)
      setSelectedPago(null)
      setMontoBonificacion('')
      // Recargar historial
      if (selectedObligacion) {
        cargarHistorial(selectedObligacion.ID_GASTO)
      }

    } catch (error) {
      console.error('Error al registrar bonificación:', error)
      alert('Error al registrar bonificación: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatFecha = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString()
  }

  const formatMonto = (monto, moneda) => {
    return `${moneda} ${parseFloat(monto).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`
  }

  const obligacionesFiltradas = obligaciones.filter(o => {
    if (filtroMoneda && o.MONEDA !== filtroMoneda) return false
    return true
  })

  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'estado-pendiente'
      case 'PAGO PARCIAL': return 'estado-parcial'
      default: return ''
    }
  }

  return (
    <div className="container">
      <h1>Pago de Obligaciones - Granja Verde</h1>

      {/* Filtros */}
      <div className="filtros">
        <div className="filtro-group">
          <label>Filtrar por moneda:</label>
          <select value={filtroMoneda} onChange={(e) => setFiltroMoneda(e.target.value)}>
            <option value="">Todas</option>
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="filtro-info">
          Mostrando {obligacionesFiltradas.length} obligaciones pendientes
        </div>
      </div>

      <div className="layout-container">
        {/* Lista de obligaciones */}
        <div className="obligaciones-list">
          <h2>Obligaciones Pendientes</h2>
          {isLoading ? (
            <p>Cargando...</p>
          ) : obligacionesFiltradas.length === 0 ? (
            <p>No hay obligaciones pendientes</p>
          ) : (
            <ul>
              {obligacionesFiltradas.map(ob => (
                <li
                  key={ob.ID_GASTO}
                  className={`obligacion-item ${selectedObligacion?.ID_GASTO === ob.ID_GASTO ? 'selected' : ''}`}
                  onClick={() => handleSelectObligacion(ob)}
                >
                  <div className="ob-header">
                    <span className="ob-categoria">{ob.CATEGORIA_NOMBRE}</span>
                    <span className={`ob-estado ${getEstadoClass(ob.ESTADO_CALCULADO)}`}>
                      {ob.ESTADO_CALCULADO}
                    </span>
                  </div>
                  <div className="ob-detalle">
                    {ob.DETALLE || 'Sin detalle'}
                  </div>
                  <div className="ob-montos">
                    <span>Total: {formatMonto(ob.MONTO_TOTAL, ob.MONEDA)}</span>
                    <span className="ob-pendiente">Pendiente: {formatMonto(ob.SALDO_PENDIENTE, ob.MONEDA)}</span>
                  </div>
                  <div className="ob-fechas">
                    <span>Fecha: {formatFecha(ob.FECHA_GASTO)}</span>
                    {ob.FECHA_VENCIMIENTO && (
                      <span className="ob-vencimiento">Vence: {formatFecha(ob.FECHA_VENCIMIENTO)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detalle de obligación seleccionada */}
        <div className="obligacion-detalle">
          {selectedObligacion ? (
            <>
              <h2>Detalle de Obligación</h2>
              <div className="detalle-card">
                <div className="detalle-row">
                  <span className="label">ID:</span>
                  <span>{selectedObligacion.ID_GASTO}</span>
                </div>
                <div className="detalle-row">
                  <span className="label">Categoría:</span>
                  <span>{selectedObligacion.CATEGORIA_NOMBRE}</span>
                </div>
                <div className="detalle-row">
                  <span className="label">Detalle:</span>
                  <span>{selectedObligacion.DETALLE || '-'}</span>
                </div>
                <div className="detalle-row">
                  <span className="label">Proveedor:</span>
                  <span>{selectedObligacion.PROVEEDOR || '-'}</span>
                </div>
                <div className="detalle-row">
                  <span className="label">Comprobante:</span>
                  <span>{selectedObligacion.NUM_COMPROBANTE || '-'}</span>
                </div>
                <div className="detalle-row">
                  <span className="label">Fecha Gasto:</span>
                  <span>{formatFecha(selectedObligacion.FECHA_GASTO)}</span>
                </div>
                <div className="detalle-row">
                  <span className="label">Vencimiento:</span>
                  <span>{formatFecha(selectedObligacion.FECHA_VENCIMIENTO)}</span>
                </div>
                <hr />
                <div className="detalle-row highlight">
                  <span className="label">Monto Total:</span>
                  <span>{formatMonto(selectedObligacion.MONTO_TOTAL, selectedObligacion.MONEDA)}</span>
                </div>
                <div className="detalle-row">
                  <span className="label">Monto Pagado:</span>
                  <span>{formatMonto(selectedObligacion.MONTO_PAGADO, selectedObligacion.MONEDA)}</span>
                </div>
                <div className="detalle-row highlight-pendiente">
                  <span className="label">Saldo Pendiente:</span>
                  <span>{formatMonto(selectedObligacion.SALDO_PENDIENTE, selectedObligacion.MONEDA)}</span>
                </div>

                <button onClick={handleOpenPaymentModal} className="btn-pagar">
                  Registrar Pago
                </button>
              </div>

              {/* Historial de pagos */}
              <h3>Historial de Pagos</h3>
              {historial.length === 0 ? (
                <p className="no-historial">No hay pagos registrados</p>
              ) : (
                <>
                  <p className="historial-hint">Haz clic en un pago para registrar una bonificación</p>
                  <table className="historial-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Método</th>
                        <th>Monto</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map(h => (
                        <tr key={h.ID_EG} className="historial-row">
                          <td>{formatFecha(h.FECHA_EG)}</td>
                          <td>{h.METODO_PAGO}</td>
                          <td>{formatMonto(h.MONTO_APLICADO, selectedObligacion.MONEDA)}</td>
                          <td>
                            <button
                              onClick={() => handleSelectPagoHistorial(h)}
                              className="btn-bonificacion-small"
                            >
                              Bonificación
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          ) : (
            <div className="no-selection">
              <p>Seleccione una obligación de la lista para ver su detalle</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de pago */}
      {showPaymentModal && selectedObligacion && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <h3>Registrar Pago</h3>
            <p className="modal-subtitle">
              Obligación: <strong>{selectedObligacion.CATEGORIA_NOMBRE}</strong>
              {selectedObligacion.DETALLE && ` - ${selectedObligacion.DETALLE}`}
            </p>
            <p className="modal-subtitle">
              Saldo pendiente: <strong>{formatMonto(selectedObligacion.SALDO_PENDIENTE, selectedObligacion.MONEDA)}</strong>
            </p>

            <div className="payment-lines-section">
              <h4>Líneas de Pago</h4>
              {paymentLines.map((line, index) => (
                <div key={index} className="payment-line">
                  <select
                    value={line.metodo_pago}
                    onChange={(e) => handlePaymentLineChange(index, 'metodo_pago', e.target.value)}
                  >
                    {METODOS_PAGO.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Monto"
                    value={line.monto}
                    onChange={(e) => handlePaymentLineChange(index, 'monto', e.target.value)}
                    step="0.01"
                    min="0.01"
                  />
                  {paymentLines.length > 1 && (
                    <button type="button" onClick={() => removePaymentLine(index)} className="btn-remove-line">
                      X
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addPaymentLine} className="btn-add-line">
                + Agregar línea de pago
              </button>
              <div className="payment-summary">
                <strong>Total a pagar: {selectedObligacion.MONEDA} {calcularSumaPagos().toFixed(2)}</strong>
                <span> / Pendiente: {selectedObligacion.MONEDA} {parseFloat(selectedObligacion.SALDO_PENDIENTE).toFixed(2)}</span>
              </div>
            </div>

            <div className="modal-buttons">
              <button onClick={() => setShowPaymentModal(false)}>Cancelar</button>
              <button
                onClick={handleConfirmPayment}
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de bonificación */}
      {showBonificacionModal && selectedPago && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Registrar Bonificación</h3>
            <p className="modal-subtitle">
              Pago del: <strong>{formatFecha(selectedPago.FECHA_EG)}</strong>
            </p>
            <p className="modal-subtitle">
              Método: <strong>{selectedPago.METODO_PAGO}</strong>
            </p>
            <p className="modal-subtitle">
              Monto del pago: <strong>{formatMonto(selectedPago.MONTO_APLICADO, selectedObligacion.MONEDA)}</strong>
            </p>

            <div className="form-group">
              <label>Monto de Bonificación *</label>
              <input
                type="number"
                placeholder="0.00"
                value={montoBonificacion}
                onChange={(e) => setMontoBonificacion(e.target.value)}
                step="0.01"
                min="0.01"
                autoFocus
              />
            </div>

            <div className="modal-buttons">
              <button onClick={() => { setShowBonificacionModal(false); setSelectedPago(null) }}>
                Cancelar
              </button>
              <button
                onClick={handleConfirmBonificacion}
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Bonificación'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .layout-container {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        .obligaciones-list {
          flex: 1;
          max-width: 450px;
        }
        .obligacion-detalle {
          flex: 1;
        }
        .filtros {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        .filtro-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filtro-group select {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .filtro-info {
          color: #666;
          font-size: 14px;
        }
        .obligaciones-list ul {
          list-style: none;
          padding: 0;
          max-height: 600px;
          overflow-y: auto;
        }
        .obligacion-item {
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .obligacion-item:hover {
          border-color: #007bff;
          background: #f8f9fa;
        }
        .obligacion-item.selected {
          border-color: #007bff;
          background: #e7f1ff;
        }
        .ob-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
        .ob-categoria {
          font-weight: bold;
        }
        .ob-estado {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .estado-pendiente {
          background: #fff3cd;
          color: #856404;
        }
        .estado-parcial {
          background: #d1ecf1;
          color: #0c5460;
        }
        .ob-detalle {
          color: #666;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .ob-montos {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .ob-pendiente {
          color: #dc3545;
          font-weight: bold;
        }
        .ob-fechas {
          display: flex;
          gap: 15px;
          font-size: 13px;
          color: #666;
        }
        .ob-vencimiento {
          color: #856404;
        }

        /* Detalle */
        .detalle-card {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .detalle-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .detalle-row .label {
          color: #666;
        }
        .detalle-row.highlight {
          font-weight: bold;
          font-size: 16px;
        }
        .detalle-row.highlight-pendiente {
          font-weight: bold;
          font-size: 18px;
          color: #dc3545;
        }
        .btn-pagar {
          width: 100%;
          margin-top: 15px;
          padding: 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
        }
        .btn-pagar:hover {
          background: #218838;
        }
        .no-selection {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          background: #f9f9f9;
          border-radius: 8px;
          color: #666;
        }
        .no-historial {
          color: #666;
          font-style: italic;
        }
        .historial-hint {
          color: #666;
          font-size: 14px;
          font-style: italic;
          margin-bottom: 10px;
        }
        .historial-table {
          width: 100%;
          border-collapse: collapse;
        }
        .historial-table th,
        .historial-table td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
        }
        .historial-table th {
          background: #f4f4f4;
        }
        .historial-row {
          transition: background 0.2s;
        }
        .historial-row:hover {
          background: #f8f9fa;
        }
        .btn-bonificacion-small {
          padding: 5px 10px;
          background: #17a2b8;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-bonificacion-small:hover {
          background: #138496;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .form-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: white;
          padding: 25px;
          border-radius: 10px;
          min-width: 300px;
          max-width: 500px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .modal-large {
          min-width: 450px;
          max-width: 550px;
        }
        .modal h3 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        .modal-subtitle {
          margin-bottom: 10px;
          color: #666;
        }
        .modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .modal-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .modal-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }

        /* Payment lines */
        .payment-lines-section h4 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        .payment-line {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
          align-items: center;
        }
        .payment-line select,
        .payment-line input {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          flex: 1;
        }
        .btn-remove-line {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 4px;
        }
        .btn-add-line {
          background: #28a745;
          color: white;
          border: none;
          padding: 8px 15px;
          cursor: pointer;
          border-radius: 4px;
        }
        .payment-summary {
          margin-top: 10px;
          padding: 10px;
          background: #e9ecef;
          border-radius: 4px;
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .layout-container {
            flex-direction: column;
          }
          .obligaciones-list {
            max-width: none;
          }
        }
      `}</style>
    </div>
  )
}

export default PagoObligaciones
