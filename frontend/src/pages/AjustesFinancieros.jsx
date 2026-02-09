import { useState, useEffect, useCallback } from 'react'

const API_URL = `${window.location.protocol}//${window.location.hostname}:3001/api/ajustes-financieros`
const API_CAMBIOS = `${window.location.protocol}//${window.location.hostname}:3001/api/cambios`

function AjustesFinancieros() {
  // Estado general
  const [activeTab, setActiveTab] = useState('lista')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Lista de ajustes
  const [ajustes, setAjustes] = useState([])
  const [selectedAjuste, setSelectedAjuste] = useState(null)
  const [showDetalleModal, setShowDetalleModal] = useState(false)

  // Filtros
  const [filtros, setFiltros] = useState({
    idTipoAjuste: '',
    fechaDesde: '',
    fechaHasta: '',
    estado: '',
    moneda: ''
  })

  // Catálogos
  const [dimensiones, setDimensiones] = useState([])
  const [cuentas, setCuentas] = useState([])

  // Formulario nuevo ajuste
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().slice(0, 16),
    idTipoAjuste: '',
    monto: '',
    moneda: 'UYU',
    idCuenta: '',
    referencia: '',
    nota: ''
  })

  const [detalles, setDetalles] = useState([
    { idGasto: '', idVenta: '', montoAplicado: '', porcentaje: '', baseCalculo: '' }
  ])

  // Gestión de dimensiones
  const [nuevaDimension, setNuevaDimension] = useState({
    codigo: '',
    descripcion: '',
    naturaleza: 'INGRESO'
  })

  useEffect(() => {
    cargarDimensiones()
    cargarCuentas()
  }, [])

  useEffect(() => {
    if (activeTab === 'lista') {
      cargarAjustes()
    }
  }, [activeTab, filtros])

  const cargarAjustes = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtros.idTipoAjuste) params.append('idTipoAjuste', filtros.idTipoAjuste)
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde)
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta)
      if (filtros.estado) params.append('estado', filtros.estado)
      if (filtros.moneda) params.append('moneda', filtros.moneda)

      const response = await fetch(`${API_URL}?${params}`)
      const data = await response.json()
      setAjustes(data)
    } catch (error) {
      console.error('Error al cargar ajustes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const cargarDimensiones = async () => {
    try {
      const response = await fetch(`${API_URL}/dimensiones`)
      const data = await response.json()
      setDimensiones(data)
    } catch (error) {
      console.error('Error al cargar dimensiones:', error)
    }
  }

  const cargarCuentas = async () => {
    try {
      const response = await fetch(`${API_CAMBIOS}/cuentas`)
      const data = await response.json()
      setCuentas(data)
    } catch (error) {
      console.error('Error al cargar cuentas:', error)
    }
  }

  const verDetalle = async (ajuste) => {
    try {
      const response = await fetch(`${API_URL}/${ajuste.ID_AF}`)
      const data = await response.json()
      setSelectedAjuste(data)
      setShowDetalleModal(true)
    } catch (error) {
      console.error('Error al cargar detalle:', error)
      alert('Error al cargar detalle del ajuste')
    }
  }

  const anularAjuste = async (idAf) => {
    if (!confirm('¿Está seguro de anular este ajuste?')) return

    try {
      const response = await fetch(`${API_URL}/${idAf}/anular`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido')
      }

      alert('Ajuste anulado exitosamente')
      cargarAjustes()
      setShowDetalleModal(false)
    } catch (error) {
      console.error('Error al anular ajuste:', error)
      alert('Error al anular ajuste: ' + error.message)
    }
  }

  const crearAjuste = async (e) => {
    e.preventDefault()

    if (!formData.idTipoAjuste) {
      alert('Debe seleccionar un tipo de ajuste')
      return
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      alert('El monto debe ser mayor a 0')
      return
    }

    for (let i = 0; i < detalles.length; i++) {
      const det = detalles[i]
      if (!det.idGasto && !det.idVenta) {
        alert(`Detalle ${i + 1}: debe especificar un Gasto o una Venta`)
        return
      }
      if (!det.montoAplicado || parseFloat(det.montoAplicado) <= 0) {
        alert(`Detalle ${i + 1}: el monto aplicado debe ser mayor a 0`)
        return
      }
    }

    const sumaMontos = detalles.reduce((sum, d) => sum + parseFloat(d.montoAplicado || 0), 0)
    const montoTotal = parseFloat(formData.monto)
    const diff = Math.abs(sumaMontos - montoTotal)

    if (diff > 0.01) {
      alert(`La suma de montos aplicados (${sumaMontos.toFixed(2)}) debe ser igual al monto total (${montoTotal.toFixed(2)})`)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        fecha: formData.fecha,
        idTipoAjuste: parseInt(formData.idTipoAjuste),
        monto: parseFloat(formData.monto),
        moneda: formData.moneda,
        idCuenta: formData.idCuenta ? parseInt(formData.idCuenta) : null,
        referencia: formData.referencia || null,
        nota: formData.nota || null,
        detalle: detalles.map(d => ({
          idGasto: d.idGasto ? parseInt(d.idGasto) : null,
          idVenta: d.idVenta ? parseInt(d.idVenta) : null,
          montoAplicado: parseFloat(d.montoAplicado),
          porcentaje: d.porcentaje ? parseFloat(d.porcentaje) : null,
          baseCalculo: d.baseCalculo ? parseFloat(d.baseCalculo) : null
        }))
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

      alert('Ajuste creado exitosamente')
      resetForm()
      setActiveTab('lista')
    } catch (error) {
      console.error('Error al crear ajuste:', error)
      alert('Error al crear ajuste: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const crearDimension = async (e) => {
    e.preventDefault()

    if (!nuevaDimension.codigo || !nuevaDimension.descripcion) {
      alert('Código y descripción son requeridos')
      return
    }

    try {
      const response = await fetch(`${API_URL}/dimensiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaDimension)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido')
      }

      alert('Tipo de ajuste creado exitosamente')
      setNuevaDimension({ codigo: '', descripcion: '', naturaleza: 'INGRESO' })
      cargarDimensiones()
    } catch (error) {
      console.error('Error al crear dimensión:', error)
      alert('Error: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().slice(0, 16),
      idTipoAjuste: '',
      monto: '',
      moneda: 'UYU',
      idCuenta: '',
      referencia: '',
      nota: ''
    })
    setDetalles([
      { idGasto: '', idVenta: '', montoAplicado: '', porcentaje: '', baseCalculo: '' }
    ])
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDetalleChange = (index, field, value) => {
    const newDetalles = [...detalles]
    newDetalles[index][field] = value
    setDetalles(newDetalles)
  }

  const agregarDetalle = () => {
    setDetalles([...detalles, { idGasto: '', idVenta: '', montoAplicado: '', porcentaje: '', baseCalculo: '' }])
  }

  const eliminarDetalle = (index) => {
    if (detalles.length > 1) {
      setDetalles(detalles.filter((_, i) => i !== index))
    }
  }

  const calcularSumaDetalles = useCallback(() => {
    return detalles.reduce((sum, d) => sum + (parseFloat(d.montoAplicado) || 0), 0)
  }, [detalles])

  return (
    <div className="container">
      <h1>Ajustes Financieros</h1>

      {/* Pestañas */}
      <div className="tabs-container">
        <button
          className={activeTab === 'lista' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('lista')}
        >
          Lista de Ajustes
        </button>
        <button
          className={activeTab === 'nuevo' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('nuevo')}
        >
          Nuevo Ajuste
        </button>
        <button
          className={activeTab === 'dimensiones' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('dimensiones')}
        >
          Tipos de Ajuste
        </button>
      </div>

      {/* PESTAÑA: LISTA */}
      {activeTab === 'lista' && (
        <div className="tab-content">
          <div className="filtros-section">
            <h3>Filtros</h3>
            <div className="filtros-grid">
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={filtros.idTipoAjuste}
                  onChange={(e) => setFiltros(prev => ({ ...prev, idTipoAjuste: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {dimensiones.map(dim => (
                    <option key={dim.ID_TIPO_AJUSTE} value={dim.ID_TIPO_AJUSTE}>
                      {dim.CODIGO}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Desde</label>
                <input
                  type="date"
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fechaDesde: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Hasta</label>
                <input
                  type="date"
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fechaHasta: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="ANULADO">Anulado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Moneda</label>
                <select
                  value={filtros.moneda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, moneda: e.target.value }))}
                >
                  <option value="">Todas</option>
                  <option value="UYU">UYU</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="loading-message">Cargando...</p>
          ) : (
            <div className="tabla-wrapper">
              <table className="tabla-ajustes">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Cuenta</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ajustes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">
                        No hay ajustes registrados
                      </td>
                    </tr>
                  ) : (
                    ajustes.map(ajuste => (
                      <tr key={ajuste.ID_AF}>
                        <td>{new Date(ajuste.FECHA_AF).toLocaleDateString()}</td>
                        <td>
                          <div className="tipo-cell">
                            <strong>{ajuste.TIPO_CODIGO}</strong>
                            <span className={`badge ${ajuste.TIPO_NATURALEZA === 'INGRESO' ? 'ingreso' : 'egreso'}`}>
                              {ajuste.TIPO_NATURALEZA}
                            </span>
                          </div>
                        </td>
                        <td className="monto-cell">
                          {parseFloat(ajuste.MONTO).toFixed(2)} {ajuste.MONEDA}
                        </td>
                        <td>{ajuste.NOMBRE_CUENTA || '-'}</td>
                        <td>
                          <span className={`estado-badge ${ajuste.ESTADO.toLowerCase()}`}>
                            {ajuste.ESTADO}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-ver-detalle"
                            onClick={() => verDetalle(ajuste)}
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA: NUEVO AJUSTE */}
      {activeTab === 'nuevo' && (
        <div className="tab-content">
          <form onSubmit={crearAjuste}>
            <div className="section-box">
              <h3>Datos del Ajuste</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Fecha *</label>
                  <input
                    type="datetime-local"
                    value={formData.fecha}
                    onChange={(e) => handleFormChange('fecha', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tipo de Ajuste *</label>
                  <select
                    value={formData.idTipoAjuste}
                    onChange={(e) => handleFormChange('idTipoAjuste', e.target.value)}
                    required
                  >
                    <option value="">Seleccione...</option>
                    {dimensiones.map(dim => (
                      <option key={dim.ID_TIPO_AJUSTE} value={dim.ID_TIPO_AJUSTE}>
                        {dim.CODIGO} - {dim.DESCRIPCION} ({dim.NATURALEZA})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Monto Total *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => handleFormChange('monto', e.target.value)}
                    required
                  />
                  <small className="hint">Suma actual: {calcularSumaDetalles().toFixed(2)}</small>
                </div>

                <div className="form-group">
                  <label>Moneda *</label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => handleFormChange('moneda', e.target.value)}
                    required
                  >
                    <option value="UYU">UYU</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cuenta</label>
                  <select
                    value={formData.idCuenta}
                    onChange={(e) => handleFormChange('idCuenta', e.target.value)}
                  >
                    <option value="">Sin cuenta</option>
                    {cuentas
                      .filter(c => c.MONEDA === formData.moneda)
                      .map(cuenta => (
                        <option key={cuenta.ID_CUENTA} value={cuenta.ID_CUENTA}>
                          {cuenta.NOMBRE}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Referencia</label>
                  <input
                    type="text"
                    value={formData.referencia}
                    onChange={(e) => handleFormChange('referencia', e.target.value)}
                    placeholder="Ej: POS-2026-02"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nota</label>
                <textarea
                  value={formData.nota}
                  onChange={(e) => handleFormChange('nota', e.target.value)}
                  rows="2"
                  placeholder="Nota adicional..."
                />
              </div>
            </div>

            <div className="section-box">
              <div className="section-header">
                <h3>Detalle (Vinculación a Gastos/Ventas)</h3>
                <button type="button" className="btn-secondary" onClick={agregarDetalle}>
                  + Agregar Línea
                </button>
              </div>

              {detalles.map((detalle, index) => (
                <div key={index} className="detalle-row">
                  <div className="detalle-grid">
                    <div className="form-group">
                      <label>ID Gasto</label>
                      <input
                        type="number"
                        value={detalle.idGasto}
                        onChange={(e) => handleDetalleChange(index, 'idGasto', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="form-group">
                      <label>ID Venta</label>
                      <input
                        type="number"
                        value={detalle.idVenta}
                        onChange={(e) => handleDetalleChange(index, 'idVenta', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="form-group">
                      <label>Monto Aplicado *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.montoAplicado}
                        onChange={(e) => handleDetalleChange(index, 'montoAplicado', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Porcentaje %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.porcentaje}
                        onChange={(e) => handleDetalleChange(index, 'porcentaje', e.target.value)}
                        placeholder="Ej: 3.50"
                      />
                    </div>

                    <div className="form-group">
                      <label>Base de Cálculo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.baseCalculo}
                        onChange={(e) => handleDetalleChange(index, 'baseCalculo', e.target.value)}
                        placeholder="Monto base"
                      />
                    </div>

                    {detalles.length > 1 && (
                      <div className="form-group">
                        <label>&nbsp;</label>
                        <button
                          type="button"
                          className="btn-eliminar"
                          onClick={() => eliminarDetalle(index)}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                Limpiar
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creando...' : 'Crear Ajuste'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA: DIMENSIONES */}
      {activeTab === 'dimensiones' && (
        <div className="tab-content">
          <div className="section-box">
            <h3>Crear Nuevo Tipo de Ajuste</h3>
            <form onSubmit={crearDimension}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Código *</label>
                  <input
                    type="text"
                    value={nuevaDimension.codigo}
                    onChange={(e) => setNuevaDimension(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                    placeholder="Ej: BONIF_BANCO"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripción *</label>
                  <input
                    type="text"
                    value={nuevaDimension.descripcion}
                    onChange={(e) => setNuevaDimension(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Ej: Bonificación bancaria"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Naturaleza *</label>
                  <select
                    value={nuevaDimension.naturaleza}
                    onChange={(e) => setNuevaDimension(prev => ({ ...prev, naturaleza: e.target.value }))}
                    required
                  >
                    <option value="INGRESO">Ingreso</option>
                    <option value="EGRESO">Egreso</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-submit">
                Crear Tipo
              </button>
            </form>
          </div>

          <div className="tabla-wrapper">
            <h3>Tipos de Ajuste Existentes</h3>
            <table className="tabla-ajustes">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Naturaleza</th>
                  <th>Activo</th>
                </tr>
              </thead>
              <tbody>
                {dimensiones.map(dim => (
                  <tr key={dim.ID_TIPO_AJUSTE}>
                    <td><strong>{dim.CODIGO}</strong></td>
                    <td>{dim.DESCRIPCION}</td>
                    <td>
                      <span className={`badge ${dim.NATURALEZA === 'INGRESO' ? 'ingreso' : 'egreso'}`}>
                        {dim.NATURALEZA}
                      </span>
                    </td>
                    <td>
                      <span className={`estado-badge ${dim.ACTIVO ? 'activo' : 'anulado'}`}>
                        {dim.ACTIVO ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DE AJUSTE */}
      {showDetalleModal && selectedAjuste && (
        <div className="modal-overlay" onClick={() => setShowDetalleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDetalleModal(false)}>×</button>

            <h2>Ajuste #{selectedAjuste.ID_AF}</h2>

            <div className="info-grid">
              <div className="info-item">
                <strong>Fecha:</strong>
                <span>{new Date(selectedAjuste.FECHA_AF).toLocaleString()}</span>
              </div>
              <div className="info-item">
                <strong>Tipo:</strong>
                <span>{selectedAjuste.TIPO_CODIGO} - {selectedAjuste.TIPO_DESCRIPCION}</span>
              </div>
              <div className="info-item">
                <strong>Naturaleza:</strong>
                <span className={`badge ${selectedAjuste.TIPO_NATURALEZA === 'INGRESO' ? 'ingreso' : 'egreso'}`}>
                  {selectedAjuste.TIPO_NATURALEZA}
                </span>
              </div>
              <div className="info-item">
                <strong>Monto:</strong>
                <span>{parseFloat(selectedAjuste.MONTO).toFixed(2)} {selectedAjuste.MONEDA}</span>
              </div>
              <div className="info-item">
                <strong>Cuenta:</strong>
                <span>{selectedAjuste.NOMBRE_CUENTA || '-'}</span>
              </div>
              <div className="info-item">
                <strong>Referencia:</strong>
                <span>{selectedAjuste.REFERENCIA || '-'}</span>
              </div>
              <div className="info-item">
                <strong>Estado:</strong>
                <span className={`estado-badge ${selectedAjuste.ESTADO.toLowerCase()}`}>
                  {selectedAjuste.ESTADO}
                </span>
              </div>
              {selectedAjuste.NOTA && (
                <div className="info-item full-width">
                  <strong>Nota:</strong>
                  <span>{selectedAjuste.NOTA}</span>
                </div>
              )}
            </div>

            <h3>Detalle de Vinculación</h3>
            <table className="tabla-ajustes">
              <thead>
                <tr>
                  <th>ID Gasto</th>
                  <th>ID Venta</th>
                  <th>Monto</th>
                  <th>%</th>
                  <th>Base</th>
                </tr>
              </thead>
              <tbody>
                {selectedAjuste.detalle.map(det => (
                  <tr key={det.ID_AF_DET}>
                    <td>{det.ID_GASTO || '-'}</td>
                    <td>{det.ID_VENTA || '-'}</td>
                    <td>{parseFloat(det.MONTO_APLICADO).toFixed(2)}</td>
                    <td>{det.PORCENTAJE ? `${parseFloat(det.PORCENTAJE).toFixed(2)}%` : '-'}</td>
                    <td>{det.BASE_CALCULO ? parseFloat(det.BASE_CALCULO).toFixed(2) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-actions">
              {selectedAjuste.ESTADO === 'ACTIVO' && (
                <button
                  className="btn-eliminar"
                  onClick={() => anularAjuste(selectedAjuste.ID_AF)}
                >
                  Anular Ajuste
                </button>
              )}
              <button
                className="btn-secondary"
                onClick={() => setShowDetalleModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tabs-container {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
          border-bottom: 2px solid #ddd;
        }
        .tab-button {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #666;
          transition: all 0.3s;
        }
        .tab-button:hover {
          color: #2e7d32;
        }
        .tab-button.active {
          color: #2e7d32;
          border-bottom-color: #2e7d32;
          font-weight: bold;
        }

        .tab-content {
          margin-top: 20px;
        }

        .section-box {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .section-box h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #2e7d32;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .section-header h3 {
          margin: 0;
        }

        .filtros-section {
          background: #fff3cd;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .filtros-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #856404;
        }
        .filtros-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }
        .form-group label {
          margin-bottom: 5px;
          font-weight: bold;
          font-size: 14px;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
          font-size: 14px;
        }
        .form-group textarea {
          resize: vertical;
        }
        .hint {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }
        .form-grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }

        .detalle-row {
          background: white;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
        }
        .detalle-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .btn-submit {
          padding: 12px 30px;
          background: #2e7d32;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }
        .btn-submit:hover {
          background: #1b5e20;
        }
        .btn-submit:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: #ff9800;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .btn-secondary:hover {
          background: #f57c00;
        }

        .tabla-wrapper {
          margin-top: 20px;
        }
        .tabla-wrapper h3 {
          margin-bottom: 15px;
          color: #2e7d32;
        }
        .tabla-ajustes {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tabla-ajustes th,
        .tabla-ajustes td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        .tabla-ajustes th {
          background: #f5f5f5;
          font-weight: bold;
          color: #333;
        }
        .tabla-ajustes tbody tr:hover {
          background: #f9f9f9;
        }
        .no-data {
          text-align: center;
          color: #999;
          padding: 30px;
        }

        .tipo-cell {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .monto-cell {
          font-weight: bold;
          text-align: right;
        }

        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }
        .badge.ingreso {
          background: #d4edda;
          color: #155724;
        }
        .badge.egreso {
          background: #f8d7da;
          color: #721c24;
        }

        .estado-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
        }
        .estado-badge.activo {
          background: #d1ecf1;
          color: #0c5460;
        }
        .estado-badge.anulado {
          background: #e2e3e5;
          color: #383d41;
        }

        .btn-ver-detalle {
          padding: 6px 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }
        .btn-ver-detalle:hover {
          background: #0056b3;
        }

        .loading-message {
          text-align: center;
          padding: 40px;
          color: #666;
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
          padding: 30px;
          border-radius: 10px;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .modal h2 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #2e7d32;
        }
        .modal h3 {
          margin-top: 25px;
          margin-bottom: 15px;
          color: #2e7d32;
        }
        .modal-close {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
        }
        .modal-close:hover {
          color: #333;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .info-item.full-width {
          grid-column: 1 / -1;
        }
        .info-item strong {
          color: #666;
          font-size: 13px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }

        @media (max-width: 768px) {
          .tabs-container {
            overflow-x: auto;
          }
          .tab-button {
            padding: 10px 16px;
            font-size: 14px;
          }
          .form-grid-2,
          .form-grid-3,
          .detalle-grid {
            grid-template-columns: 1fr;
          }
          .tabla-ajustes {
            font-size: 13px;
          }
          .tabla-ajustes th,
          .tabla-ajustes td {
            padding: 8px;
          }
          .modal {
            margin: 10px;
            padding: 20px;
            max-width: calc(100vw - 20px);
          }
        }
      `}</style>
    </div>
  )
}

export default AjustesFinancieros
