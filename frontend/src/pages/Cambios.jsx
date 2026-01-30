import { useState, useEffect, useMemo } from 'react'

const API_URL = `${window.location.protocol}//${window.location.hostname}:3001/api/cambios`

function Cambios() {
  const [cuentas, setCuentas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [idCuentaOrigen, setIdCuentaOrigen] = useState('')
  const [idCuentaDestino, setIdCuentaDestino] = useState('')
  const [factorConversion, setFactorConversion] = useState('')
  const [montoDestino, setMontoDestino] = useState('') // Siempre es el monto deseado en destino
  const [nota, setNota] = useState('')

  // Historial
  const [historial, setHistorial] = useState([])
  const [showHistorial, setShowHistorial] = useState(false)

  useEffect(() => {
    cargarCuentas()
  }, [])

  const cargarCuentas = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/cuentas`)
      const data = await response.json()
      setCuentas(data)
    } catch (error) {
      console.error('Error al cargar cuentas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const cargarHistorial = async () => {
    try {
      const response = await fetch(`${API_URL}?limit=20`)
      const data = await response.json()
      setHistorial(data)
      setShowHistorial(true)
    } catch (error) {
      console.error('Error al cargar historial:', error)
    }
  }

  // Cuentas filtradas (destino excluye origen)
  const cuentasDestino = useMemo(() => {
    return cuentas.filter(c => c.ID_CUENTA !== parseInt(idCuentaOrigen))
  }, [cuentas, idCuentaOrigen])

  // Info de cuentas seleccionadas
  const cuentaOrigen = useMemo(() => {
    return cuentas.find(c => c.ID_CUENTA === parseInt(idCuentaOrigen))
  }, [cuentas, idCuentaOrigen])

  const cuentaDestino = useMemo(() => {
    return cuentas.find(c => c.ID_CUENTA === parseInt(idCuentaDestino))
  }, [cuentas, idCuentaDestino])

  // Detectar si es misma moneda
  const mismaMnoneda = useMemo(() => {
    return cuentaOrigen && cuentaDestino && cuentaOrigen.MONEDA === cuentaDestino.MONEDA
  }, [cuentaOrigen, cuentaDestino])

  // Auto-setear factor a 1 si misma moneda
  useEffect(() => {
    if (mismaMnoneda) {
      setFactorConversion('1')
    } else if (factorConversion === '1') {
      setFactorConversion('')
    }
  }, [mismaMnoneda])

  // Cálculo de montos - siempre basado en monto deseado en destino
  const calculos = useMemo(() => {
    if (!cuentaOrigen || !cuentaDestino || !montoDestino || !factorConversion) {
      return null
    }

    const monto = parseFloat(montoDestino)
    const factor = parseFloat(factorConversion)
    if (isNaN(monto) || isNaN(factor) || monto <= 0 || factor <= 0) {
      return null
    }

    let montoOrigen, montoDestinoCalc

    if (cuentaOrigen.MONEDA === cuentaDestino.MONEDA) {
      // Transferencia misma moneda
      montoOrigen = monto
      montoDestinoCalc = monto
    } else {
      // El monto ingresado es lo que quiero en destino
      montoDestinoCalc = monto
      if (cuentaOrigen.MONEDA === 'UYU' && cuentaDestino.MONEDA === 'USD') {
        // Quiero X USD, necesito X * factor UYU
        montoOrigen = monto * factor
      } else {
        // Quiero X UYU, necesito X / factor USD
        montoOrigen = monto / factor
      }
    }

    const saldoOrigen = parseFloat(cuentaOrigen.SALDO_TEORICO) || 0
    const saldoSuficiente = saldoOrigen >= montoOrigen

    return {
      montoOrigen: Math.round(montoOrigen * 100) / 100,
      montoDestino: Math.round(montoDestinoCalc * 100) / 100,
      saldoOrigen,
      saldoSuficiente,
      nuevoSaldoOrigen: Math.round((saldoOrigen - montoOrigen) * 100) / 100
    }
  }, [cuentaOrigen, cuentaDestino, montoDestino, factorConversion])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!idCuentaOrigen || !idCuentaDestino) {
      alert('Debe seleccionar cuenta origen y destino')
      return
    }

    if (!factorConversion || parseFloat(factorConversion) <= 0) {
      alert('El factor de conversión debe ser mayor a 0')
      return
    }

    if (!montoDestino || parseFloat(montoDestino) <= 0) {
      alert('El monto debe ser mayor a 0')
      return
    }

    if (calculos && !calculos.saldoSuficiente) {
      alert(`Saldo insuficiente en ${cuentaOrigen.NOMBRE}`)
      return
    }

    setIsSubmitting(true)

    try {
      // Siempre enviamos como DESTINO porque el monto es lo que queremos recibir
      const payload = {
        id_cuenta_origen: parseInt(idCuentaOrigen),
        id_cuenta_destino: parseInt(idCuentaDestino),
        monto_input: parseFloat(montoDestino),
        moneda_input: 'DESTINO',
        factor_conversion: parseFloat(factorConversion),
        nota: nota || null
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido')
      }

      alert(`Cambio registrado exitosamente!\n\nEgreso: ${result.moneda_origen} ${result.monto_origen.toFixed(2)} de ${result.cuenta_origen}\nIngreso: ${result.moneda_destino} ${result.monto_destino.toFixed(2)} a ${result.cuenta_destino}`)

      // Limpiar formulario
      setIdCuentaOrigen('')
      setIdCuentaDestino('')
      setFactorConversion('')
      setMontoDestino('')
      setNota('')

      // Recargar cuentas para actualizar saldos
      cargarCuentas()

    } catch (error) {
      console.error('Error al registrar cambio:', error)
      alert('Error al registrar cambio: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatMonto = (monto, moneda) => {
    return `${moneda} ${parseFloat(monto).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`
  }

  const formatFecha = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleString()
  }

  if (isLoading) {
    return <div className="container"><p>Cargando...</p></div>
  }

  return (
    <div className="container">
      <h1>Cambio de Moneda / Transferencia</h1>

      <div className="layout-container">
        {/* Formulario */}
        <div className="form-section">
          <form onSubmit={handleSubmit}>
            {/* Cuenta Origen */}
            <div className="form-group">
              <label>Cuenta Origen *</label>
              <select
                value={idCuentaOrigen}
                onChange={(e) => {
                  setIdCuentaOrigen(e.target.value)
                  // Reset destino si era igual
                  if (e.target.value === idCuentaDestino) {
                    setIdCuentaDestino('')
                  }
                }}
                required
              >
                <option value="">Seleccione cuenta origen</option>
                {cuentas.map(c => (
                  <option key={c.ID_CUENTA} value={c.ID_CUENTA}>
                    {c.NOMBRE} - Saldo: {formatMonto(c.SALDO_TEORICO, c.MONEDA)}
                  </option>
                ))}
              </select>
            </div>

            {/* Cuenta Destino */}
            <div className="form-group">
              <label>Cuenta Destino *</label>
              <select
                value={idCuentaDestino}
                onChange={(e) => setIdCuentaDestino(e.target.value)}
                required
                disabled={!idCuentaOrigen}
              >
                <option value="">Seleccione cuenta destino</option>
                {cuentasDestino.map(c => (
                  <option key={c.ID_CUENTA} value={c.ID_CUENTA}>
                    {c.NOMBRE} - Saldo: {formatMonto(c.SALDO_TEORICO, c.MONEDA)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de operación */}
            {cuentaOrigen && cuentaDestino && (
              <div className="operation-type">
                {mismaMnoneda ? (
                  <span className="tag tag-transfer">Transferencia ({cuentaOrigen.MONEDA})</span>
                ) : (
                  <span className="tag tag-exchange">
                    Cambio: {cuentaOrigen.MONEDA} → {cuentaDestino.MONEDA}
                  </span>
                )}
              </div>
            )}

            {/* Factor de conversión */}
            <div className="form-group">
              <label>
                Factor de Conversión (1 USD = X UYU) *
                {mismaMnoneda && <span className="hint"> (Fijo en 1 para transferencias)</span>}
              </label>
              <input
                type="number"
                value={factorConversion}
                onChange={(e) => setFactorConversion(e.target.value)}
                placeholder="Ej: 38.50"
                step="0.0001"
                min="0.0001"
                required
                disabled={mismaMnoneda}
              />
            </div>

            {/* Monto deseado en destino */}
            <div className="form-group">
              <label>
                Monto que quiero recibir *
                {cuentaDestino && <span className="hint"> (en {cuentaDestino.MONEDA})</span>}
              </label>
              <input
                type="number"
                value={montoDestino}
                onChange={(e) => setMontoDestino(e.target.value)}
                placeholder={cuentaDestino ? `Monto en ${cuentaDestino.MONEDA}` : 'Ingrese monto'}
                step="0.01"
                min="0.01"
                required
              />
            </div>

            {/* Nota opcional */}
            <div className="form-group">
              <label>Nota (opcional)</label>
              <input
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: Cambio para pago proveedores"
              />
            </div>

            {/* Preview */}
            {calculos && (
              <div className={`preview-box ${!calculos.saldoSuficiente ? 'error' : ''}`}>
                <h4>Resultado de la operación:</h4>
                <div className="preview-row">
                  <span className="label">Egreso:</span>
                  <span className="value egreso">
                    -{formatMonto(calculos.montoOrigen, cuentaOrigen.MONEDA)} de {cuentaOrigen.NOMBRE}
                  </span>
                </div>
                <div className="preview-row">
                  <span className="label">Ingreso:</span>
                  <span className="value ingreso">
                    +{formatMonto(calculos.montoDestino, cuentaDestino.MONEDA)} a {cuentaDestino.NOMBRE}
                  </span>
                </div>
                <hr />
                <div className="preview-row">
                  <span className="label">Saldo actual {cuentaOrigen.NOMBRE}:</span>
                  <span>{formatMonto(calculos.saldoOrigen, cuentaOrigen.MONEDA)}</span>
                </div>
                <div className="preview-row">
                  <span className="label">Saldo después:</span>
                  <span className={calculos.saldoSuficiente ? '' : 'error-text'}>
                    {formatMonto(calculos.nuevoSaldoOrigen, cuentaOrigen.MONEDA)}
                  </span>
                </div>
                {!calculos.saldoSuficiente && (
                  <div className="error-message">
                    Saldo insuficiente para realizar la operación
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting || (calculos && !calculos.saldoSuficiente)}
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Operación'}
            </button>
          </form>
        </div>

        {/* Panel lateral con resumen de cuentas */}
        <div className="summary-section">
          <h3>Saldos de Cuentas</h3>
          <div className="cuentas-resumen">
            {cuentas.map(c => (
              <div key={c.ID_CUENTA} className="cuenta-card">
                <span className="cuenta-nombre">{c.NOMBRE}</span>
                <span className="cuenta-saldo">{formatMonto(c.SALDO_TEORICO, c.MONEDA)}</span>
              </div>
            ))}
          </div>

          <button className="btn-historial" onClick={cargarHistorial}>
            Ver Historial de Cambios
          </button>
        </div>
      </div>

      {/* Modal Historial */}
      {showHistorial && (
        <div className="modal-overlay">
          <div className="modal modal-historial">
            <h3>Historial de Cambios</h3>
            {historial.length === 0 ? (
              <p>No hay cambios registrados</p>
            ) : (
              <table className="historial-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Factor</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(h => (
                    <tr key={h.ID_CAMBIO}>
                      <td>{formatFecha(h.FECHA_CAMBIO)}</td>
                      <td>
                        {formatMonto(h.MONTO_ORIGEN, h.MONEDA_ORIGEN)}
                        <br />
                        <small>{h.CUENTA_ORIGEN_NOMBRE}</small>
                      </td>
                      <td>
                        {formatMonto(h.MONTO_DESTINO, h.MONEDA_DESTINO)}
                        <br />
                        <small>{h.CUENTA_DESTINO_NOMBRE}</small>
                      </td>
                      <td>{h.FACTOR_CONVERSION}</td>
                      <td>{h.NOTA || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-buttons">
              <button onClick={() => setShowHistorial(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .layout-container {
          display: flex;
          gap: 30px;
          margin-top: 20px;
        }
        .form-section {
          flex: 2;
          max-width: 600px;
        }
        .summary-section {
          flex: 1;
          min-width: 280px;
        }

        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
          font-size: 16px;
        }
        .form-group input:disabled,
        .form-group select:disabled {
          background: #f5f5f5;
        }
        .hint {
          font-weight: normal;
          font-size: 12px;
          color: #666;
        }

        .operation-type {
          margin-bottom: 20px;
        }
        .tag {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 15px;
          font-size: 14px;
          font-weight: bold;
        }
        .tag-transfer {
          background: #d1ecf1;
          color: #0c5460;
        }
        .tag-exchange {
          background: #fff3cd;
          color: #856404;
        }

        .preview-box {
          background: #e8f5e9;
          border: 2px solid #4caf50;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .preview-box.error {
          background: #ffebee;
          border-color: #f44336;
        }
        .preview-box h4 {
          margin-top: 0;
          margin-bottom: 15px;
        }
        .preview-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .preview-row .label {
          color: #666;
        }
        .preview-row .value {
          font-weight: bold;
        }
        .egreso {
          color: #dc3545;
        }
        .ingreso {
          color: #28a745;
        }
        .error-text {
          color: #dc3545;
          font-weight: bold;
        }
        .error-message {
          margin-top: 15px;
          padding: 10px;
          background: #f8d7da;
          color: #721c24;
          border-radius: 4px;
          text-align: center;
          font-weight: bold;
        }

        .btn-submit {
          width: 100%;
          padding: 15px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 18px;
          cursor: pointer;
        }
        .btn-submit:hover {
          background: #0056b3;
        }
        .btn-submit:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* Summary section */
        .summary-section h3 {
          margin-top: 0;
        }
        .cuentas-resumen {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        .cuenta-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        .cuenta-nombre {
          font-weight: bold;
        }
        .cuenta-saldo {
          color: #28a745;
          font-weight: bold;
        }
        .btn-historial {
          width: 100%;
          padding: 10px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .btn-historial:hover {
          background: #5a6268;
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
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .modal-historial {
          min-width: 700px;
          max-width: 900px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .modal h3 {
          margin-top: 0;
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
        .historial-table small {
          color: #666;
        }
        .modal-buttons {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .modal-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #6c757d;
          color: white;
        }

        @media (max-width: 900px) {
          .layout-container {
            flex-direction: column;
          }
          .form-section {
            max-width: none;
          }
          .modal-historial {
            min-width: 90%;
          }
        }
      `}</style>
    </div>
  )
}

export default Cambios
