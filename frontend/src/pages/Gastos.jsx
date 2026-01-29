import { useState, useEffect, useCallback } from 'react'

const API_URL = `http://${window.location.hostname}:3001/api/gastos`

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'DEBITO', label: 'Débito' },
  { value: 'OTRO', label: 'Otro' }
]

const MONEDAS = [
  { value: 'UYU', label: 'UYU' },
  { value: 'USD', label: 'USD' }
]

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function Gastos() {
  const [gastosPendientes, setGastosPendientes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado del formulario básico
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    monto_total: '',
    moneda: 'UYU',
    id_categoria: '',
    id_subcategoria: ''
  })

  // Modal de escenario de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentScenario, setPaymentScenario] = useState(null) // null, 'FULL', 'PARTIAL', 'NONE'
  const [paymentLines, setPaymentLines] = useState([{ metodo_pago: 'EFECTIVO', monto: '' }])
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  // Modales opcionales
  const [showComprobanteModal, setShowComprobanteModal] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [tempComprobante, setTempComprobante] = useState('')
  const [tempDetalle, setTempDetalle] = useState('')

  // Datos temporales para el gasto en proceso
  const [pendingExpenseData, setPendingExpenseData] = useState(null)

  useEffect(() => {
    cargarCategorias()
  }, [])

  useEffect(() => {
    if (formData.id_categoria) {
      cargarSubcategorias(formData.id_categoria)
    } else {
      setSubcategorias([])
    }
  }, [formData.id_categoria])

  const cargarCategorias = async () => {
    try {
      const response = await fetch(`${API_URL}/categorias`)
      const data = await response.json()
      setCategorias(data)
    } catch (error) {
      console.error('Error al cargar categorías:', error)
    }
  }

  const cargarSubcategorias = async (categoriaId) => {
    try {
      const response = await fetch(`${API_URL}/subcategorias?categoriaId=${categoriaId}`)
      const data = await response.json()
      setSubcategorias(data)
    } catch (error) {
      console.error('Error al cargar subcategorías:', error)
    }
  }

  const calcularSumaPagos = useCallback(() => {
    return paymentLines.reduce((sum, line) => sum + (parseFloat(line.monto) || 0), 0)
  }, [paymentLines])

  // Validar formulario básico antes de abrir modal de pago
  const validarFormularioBasico = () => {
    const montoTotal = parseFloat(formData.monto_total) || 0

    if (!formData.fecha) {
      alert('La fecha es requerida')
      return false
    }
    if (montoTotal <= 0) {
      alert('El monto total debe ser mayor a 0')
      return false
    }
    if (!formData.id_categoria) {
      alert('La categoría es requerida')
      return false
    }
    return true
  }

  // Al hacer submit del formulario básico, abre el modal de pago
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validarFormularioBasico()) return

    // Resetear estado del modal
    setPaymentScenario(null)
    setPaymentLines([{ metodo_pago: 'EFECTIVO', monto: '' }])
    setFechaVencimiento('')
    setShowPaymentModal(true)
  }

  // Seleccionar escenario de pago
  const handleSelectScenario = (scenario) => {
    setPaymentScenario(scenario)

    if (scenario === 'FULL') {
      // Auto-fill con el monto total
      setPaymentLines([{ metodo_pago: 'EFECTIVO', monto: formData.monto_total }])
    } else if (scenario === 'NONE') {
      setPaymentLines([])
    } else {
      setPaymentLines([{ metodo_pago: 'EFECTIVO', monto: '' }])
    }
  }

  // Validar y confirmar el modal de pago
  const handleConfirmPayment = () => {
    const montoTotal = parseFloat(formData.monto_total) || 0
    const sumaPagos = calcularSumaPagos()

    if (paymentScenario === 'FULL') {
      if (sumaPagos !== montoTotal) {
        alert(`Para pago completo, la suma de pagos (${sumaPagos}) debe ser igual al total (${montoTotal})`)
        return
      }
      // Validar cada línea
      for (let i = 0; i < paymentLines.length; i++) {
        if (!paymentLines[i].monto || parseFloat(paymentLines[i].monto) <= 0) {
          alert(`Línea de pago ${i + 1}: monto debe ser mayor a 0`)
          return
        }
      }
    } else if (paymentScenario === 'PARTIAL') {
      if (sumaPagos <= 0 || sumaPagos >= montoTotal) {
        alert(`Para pago parcial, la suma debe ser mayor a 0 y menor al total (${montoTotal})`)
        return
      }
      if (!fechaVencimiento) {
        alert('La fecha de vencimiento es requerida para pago parcial')
        return
      }
      // Validar cada línea
      for (let i = 0; i < paymentLines.length; i++) {
        if (!paymentLines[i].monto || parseFloat(paymentLines[i].monto) <= 0) {
          alert(`Línea de pago ${i + 1}: monto debe ser mayor a 0`)
          return
        }
      }
    } else if (paymentScenario === 'NONE') {
      if (!fechaVencimiento) {
        alert('La fecha de vencimiento es requerida cuando no hay pago')
        return
      }
    }

    // Guardar datos y cerrar modal
    setPendingExpenseData({
      ...formData,
      paymentScenario,
      paymentLines: paymentScenario === 'NONE' ? [] : paymentLines.map(l => ({
        metodo_pago: l.metodo_pago,
        monto: parseFloat(l.monto)
      })),
      fechaVencimiento: paymentScenario === 'FULL' ? null : fechaVencimiento
    })

    setShowPaymentModal(false)

    // Preguntar por campos opcionales
    preguntarCamposOpcionales()
  }

  const preguntarCamposOpcionales = () => {
    const quiereComprobante = window.confirm('¿Desea agregar un número de comprobante?')
    if (quiereComprobante) {
      setShowComprobanteModal(true)
    } else {
      preguntarDetalle()
    }
  }

  const preguntarDetalle = () => {
    const quiereDetalle = window.confirm('¿Desea agregar un detalle/descripción?')
    if (quiereDetalle) {
      setShowDetalleModal(true)
    } else {
      finalizarAgregarGasto('', '')
    }
  }

  const handleComprobanteSubmit = () => {
    const comprobante = tempComprobante
    setTempComprobante('')
    setShowComprobanteModal(false)

    const quiereDetalle = window.confirm('¿Desea agregar un detalle/descripción?')
    if (quiereDetalle) {
      window._tempComprobante = comprobante
      setShowDetalleModal(true)
    } else {
      finalizarAgregarGasto(comprobante, '')
    }
  }

  const handleDetalleSubmit = () => {
    const detalle = tempDetalle
    const comprobante = window._tempComprobante || ''
    setTempDetalle('')
    setShowDetalleModal(false)
    window._tempComprobante = ''
    finalizarAgregarGasto(comprobante, detalle)
  }

  const finalizarAgregarGasto = (comprobante, detalle) => {
    if (!pendingExpenseData) return

    const nuevoGasto = {
      id: generateUUID(),
      fecha: pendingExpenseData.fecha,
      monto_total: parseFloat(pendingExpenseData.monto_total),
      moneda: pendingExpenseData.moneda,
      id_categoria: parseInt(pendingExpenseData.id_categoria),
      id_subcategoria: pendingExpenseData.id_subcategoria ? parseInt(pendingExpenseData.id_subcategoria) : null,
      fecha_vencimiento: pendingExpenseData.fechaVencimiento || null,
      num_comprobante: comprobante || null,
      detalle: detalle || null,
      paymentLines: pendingExpenseData.paymentLines,
      _categoriaNombre: categorias.find(c => c.ID_CATEGORIA === parseInt(pendingExpenseData.id_categoria))?.NOMBRE || '',
      _scenario: pendingExpenseData.paymentScenario
    }

    setGastosPendientes([...gastosPendientes, nuevoGasto])
    resetFormulario()
    setPendingExpenseData(null)
  }

  const resetFormulario = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      monto_total: '',
      moneda: 'UYU',
      id_categoria: '',
      id_subcategoria: ''
    })
  }

  const confirmarGastos = async () => {
    if (gastosPendientes.length === 0) {
      alert('No hay gastos pendientes para confirmar')
      return
    }

    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const payload = {
        expenses: gastosPendientes.map(g => ({
          fecha: g.fecha,
          monto_total: g.monto_total,
          moneda: g.moneda,
          id_categoria: g.id_categoria,
          id_subcategoria: g.id_subcategoria,
          fecha_vencimiento: g.fecha_vencimiento,
          num_comprobante: g.num_comprobante,
          detalle: g.detalle,
          paymentLines: g.paymentLines
        }))
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details?.join(', ') || 'Error desconocido')
      }

      setGastosPendientes([])
      alert(result.message || 'Gastos confirmados exitosamente')
    } catch (error) {
      console.error('Error al confirmar gastos:', error)
      alert('Error al guardar los gastos: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const eliminarGastoPendiente = (id) => {
    setGastosPendientes(gastosPendientes.filter(g => g.id !== id))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'id_categoria') {
      setFormData(prev => ({ ...prev, id_subcategoria: '' }))
    }
  }

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

  const formatearMoneda = (monto, moneda) => {
    return `${moneda} ${parseFloat(monto).toFixed(2)}`
  }

  const calcularTotalPendientes = () => {
    return gastosPendientes.reduce((total, g) => total + g.monto_total, 0).toFixed(2)
  }

  const getScenarioLabel = (scenario) => {
    switch(scenario) {
      case 'FULL': return 'Pago Completo'
      case 'PARTIAL': return 'Pago Parcial'
      case 'NONE': return 'Sin Pago'
      default: return scenario
    }
  }

  return (
    <div className="container">
      <h1>Gestión de Gastos - Granja Verde</h1>

      {/* FORMULARIO BÁSICO */}
      <form onSubmit={handleSubmit} className="form-gastos">
        <div className="form-row">
          <div className="form-group">
            <label>Fecha *</label>
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Monto Total *</label>
            <input
              type="number"
              name="monto_total"
              placeholder="0.00"
              value={formData.monto_total}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Moneda *</label>
            <select
              name="moneda"
              value={formData.moneda}
              onChange={handleChange}
              required
            >
              {MONEDAS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Categoría *</label>
            <select
              name="id_categoria"
              value={formData.id_categoria}
              onChange={handleChange}
              required
            >
              <option value="">-- Seleccione --</option>
              {categorias.map(cat => (
                <option key={cat.ID_CATEGORIA} value={cat.ID_CATEGORIA}>
                  {cat.NOMBRE}
                </option>
              ))}
            </select>
          </div>

          {subcategorias.length > 0 && (
            <div className="form-group">
              <label>Subcategoría</label>
              <select
                name="id_subcategoria"
                value={formData.id_subcategoria}
                onChange={handleChange}
              >
                <option value="">-- Ninguna --</option>
                {subcategorias.map(sub => (
                  <option key={sub.ID_SUBCATEGORIA} value={sub.ID_SUBCATEGORIA}>
                    {sub.NOMBRE}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button type="submit" className="btn-submit">Continuar</button>
      </form>

      {/* LISTA DE PENDIENTES */}
      {gastosPendientes.length > 0 && (
        <div className="gastos-pendientes">
          <h2>Gastos Pendientes de Confirmar ({gastosPendientes.length})</h2>
          <ul className="lista-gastos">
            {gastosPendientes.map((gasto) => (
              <li key={gasto.id} className="gasto-item">
                <div className="gasto-info">
                  <div className="gasto-descripcion">
                    <strong>{gasto._categoriaNombre}</strong>
                    {gasto.detalle && <span> - {gasto.detalle}</span>}
                  </div>
                  <div className="gasto-detalles">
                    {new Date(gasto.fecha).toLocaleDateString()} |
                    {getScenarioLabel(gasto._scenario)}
                    {gasto.paymentLines.length > 0 && (
                      <span> | Pagos: {gasto.paymentLines.map(p => `${p.metodo_pago} ${gasto.moneda}${p.monto}`).join(' + ')}</span>
                    )}
                    {gasto.fecha_vencimiento && <span> | Vence: {gasto.fecha_vencimiento}</span>}
                  </div>
                </div>
                <span className="gasto-monto">
                  {formatearMoneda(gasto.monto_total, gasto.moneda)}
                </span>
                <button onClick={() => eliminarGastoPendiente(gasto.id)} className="btn-eliminar">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
          <div className="total">
            Total Pendiente: {calcularTotalPendientes()}
          </div>
          <button
            onClick={confirmarGastos}
            className="btn-confirmar"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar y Guardar Todos los Gastos'}
          </button>
        </div>
      )}

      {/* MODAL ESCENARIO DE PAGO */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <h3>Seleccione el tipo de pago</h3>
            <p className="modal-subtitle">
              Total del gasto: <strong>{formData.moneda} {parseFloat(formData.monto_total).toFixed(2)}</strong>
            </p>

            {/* Botones de escenario */}
            <div className="scenario-selector">
              <button
                type="button"
                className={`scenario-option ${paymentScenario === 'FULL' ? 'selected' : ''}`}
                onClick={() => handleSelectScenario('FULL')}
              >
                <div className="scenario-title">Pago Completo</div>
                <div className="scenario-desc">El gasto se paga en su totalidad ahora</div>
              </button>
              <button
                type="button"
                className={`scenario-option ${paymentScenario === 'PARTIAL' ? 'selected' : ''}`}
                onClick={() => handleSelectScenario('PARTIAL')}
              >
                <div className="scenario-title">Pago Parcial</div>
                <div className="scenario-desc">Se paga una parte, el resto queda pendiente</div>
              </button>
              <button
                type="button"
                className={`scenario-option ${paymentScenario === 'NONE' ? 'selected' : ''}`}
                onClick={() => handleSelectScenario('NONE')}
              >
                <div className="scenario-title">Sin Pago</div>
                <div className="scenario-desc">Solo registrar la obligación (crédito)</div>
              </button>
            </div>

            {/* Contenido según escenario seleccionado */}
            {paymentScenario && (
              <div className="scenario-content">
                {/* Líneas de pago para FULL y PARTIAL */}
                {(paymentScenario === 'FULL' || paymentScenario === 'PARTIAL') && (
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
                      <strong>Suma de pagos: {formData.moneda} {calcularSumaPagos().toFixed(2)}</strong>
                      <span> / Total: {formData.moneda} {parseFloat(formData.monto_total).toFixed(2)}</span>
                      {paymentScenario === 'PARTIAL' && (
                        <span className="remaining"> | Pendiente: {formData.moneda} {(parseFloat(formData.monto_total) - calcularSumaPagos()).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Fecha de vencimiento para PARTIAL y NONE */}
                {(paymentScenario === 'PARTIAL' || paymentScenario === 'NONE') && (
                  <div className="vencimiento-section">
                    <label>Fecha de Vencimiento *</label>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <div className="modal-buttons">
              <button onClick={() => setShowPaymentModal(false)}>Cancelar</button>
              <button
                onClick={handleConfirmPayment}
                className="btn-primary"
                disabled={!paymentScenario}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE */}
      {showComprobanteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Número de Comprobante</h3>
            <input
              type="text"
              value={tempComprobante}
              onChange={(e) => setTempComprobante(e.target.value)}
              placeholder="Ej: FAC-001"
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => {
                setShowComprobanteModal(false)
                setTempComprobante('')
                preguntarDetalle()
              }}>Omitir</button>
              <button onClick={handleComprobanteSubmit} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {showDetalleModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Detalle / Descripción</h3>
            <textarea
              value={tempDetalle}
              onChange={(e) => setTempDetalle(e.target.value)}
              placeholder="Descripción del gasto..."
              rows={3}
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => {
                setShowDetalleModal(false)
                setTempDetalle('')
                const comprobante = window._tempComprobante || ''
                window._tempComprobante = ''
                finalizarAgregarGasto(comprobante, '')
              }}>Omitir</button>
              <button onClick={handleDetalleSubmit} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
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
          max-width: 600px;
        }
        .modal h3 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        .modal-subtitle {
          margin-bottom: 20px;
          color: #666;
        }
        .modal input,
        .modal textarea {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-sizing: border-box;
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
        .btn-primary:hover {
          background: #0056b3;
        }

        /* Escenarios de pago */
        .scenario-selector {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        .scenario-option {
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .scenario-option:hover {
          border-color: #007bff;
          background: #f8f9fa;
        }
        .scenario-option.selected {
          border-color: #007bff;
          background: #e7f1ff;
        }
        .scenario-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 5px;
        }
        .scenario-desc {
          font-size: 13px;
          color: #666;
        }
        .scenario-content {
          border-top: 1px solid #eee;
          padding-top: 20px;
          margin-top: 10px;
        }

        /* Líneas de pago */
        .payment-lines-section {
          margin-bottom: 20px;
        }
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
        .payment-line select {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          flex: 1;
        }
        .payment-line input {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          flex: 1;
          margin: 0;
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
        .remaining {
          color: #dc3545;
          font-weight: bold;
        }

        /* Vencimiento */
        .vencimiento-section {
          margin-top: 15px;
        }
        .vencimiento-section label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .vencimiento-section input {
          margin: 0;
        }

        /* Otros */
        .btn-confirmar:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-submit {
          margin-top: 15px;
          padding: 12px 30px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        .btn-submit:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  )
}

export default Gastos
