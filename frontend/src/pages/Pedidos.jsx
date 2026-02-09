import { useState, useEffect } from 'react'

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api/pedidos`

function Pedidos() {
  const [clientes, setClientes] = useState([])
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [lineas, setLineas] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [selectedLineas, setSelectedLineas] = useState([])
  const [stats, setStats] = useState({
    pedidos_pendientes: 0,
    pedidos_preparados: 0,
    entregados_hoy: 0,
    clientes_con_pedidos: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('')

  useEffect(() => {
    cargarClientes()
    cargarStats()
  }, [])

  const cargarClientes = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroCliente) params.append('cliente', filtroCliente)

      const response = await fetch(`${API_URL}/clientes?${params}`)
      const data = await response.json()
      setClientes(data.data || [])
    } catch (error) {
      console.error('Error al cargar clientes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const cargarStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`)
      const data = await response.json()
      setStats(data.data || {
        pedidos_pendientes: 0,
        pedidos_preparados: 0,
        entregados_hoy: 0,
        clientes_con_pedidos: 0
      })
    } catch (error) {
      console.error('Error al cargar estadisticas:', error)
    }
  }

  const cargarLineasCliente = async (idCliente) => {
    try {
      const response = await fetch(`${API_URL}/cliente/${idCliente}`)
      const data = await response.json()
      setLineas(data.data?.lineas || [])
      setPedidos(data.data?.pedidos || [])
      setSelectedLineas([])
    } catch (error) {
      console.error('Error al cargar lineas:', error)
    }
  }

  const handleSelectCliente = (cliente) => {
    setSelectedCliente(cliente)
    cargarLineasCliente(cliente.ID_CLIENTE)
  }

  const handleBuscar = (e) => {
    e.preventDefault()
    cargarClientes()
  }

  const handleToggleLinea = (idDetalle) => {
    setSelectedLineas(prev => {
      if (prev.includes(idDetalle)) {
        return prev.filter(id => id !== idDetalle)
      } else {
        return [...prev, idDetalle]
      }
    })
  }

  const handleSelectAll = () => {
    const lineasPendientes = lineas.filter(l => l.ESTADO_LINEA === 'PENDIENTE')
    if (selectedLineas.length === lineasPendientes.length) {
      setSelectedLineas([])
    } else {
      setSelectedLineas(lineasPendientes.map(l => l.ID_DETALLE))
    }
  }

  const handlePrepararSeleccionados = async () => {
    if (selectedLineas.length === 0) {
      alert('Seleccione al menos una linea')
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`${API_URL}/lineas/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLineas, estado: 'PREPARADO' })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido')
      }

      alert(result.message)
      cargarLineasCliente(selectedCliente.ID_CLIENTE)
      cargarClientes()
      cargarStats()
    } catch (error) {
      console.error('Error al preparar lineas:', error)
      alert('Error: ' + error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePrepararTodo = async () => {
    if (!selectedCliente) return

    if (!confirm('¿Marcar TODAS las lineas como PREPARADAS?')) return

    setIsUpdating(true)
    try {
      const response = await fetch(`${API_URL}/cliente/${selectedCliente.ID_CLIENTE}/preparar-todo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido')
      }

      alert(result.message)
      cargarLineasCliente(selectedCliente.ID_CLIENTE)
      cargarClientes()
      cargarStats()
    } catch (error) {
      console.error('Error al preparar todo:', error)
      alert('Error: ' + error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEntregarCliente = async () => {
    if (!selectedCliente) return

    if (!confirm('¿Confirmar ENTREGA de todos los pedidos de este cliente?')) return

    setIsUpdating(true)
    try {
      const response = await fetch(`${API_URL}/cliente/${selectedCliente.ID_CLIENTE}/entregar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido')
      }

      alert(result.message)
      setSelectedCliente(null)
      setLineas([])
      setPedidos([])
      cargarClientes()
      cargarStats()
    } catch (error) {
      console.error('Error al entregar:', error)
      alert('Error: ' + error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatFecha = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getEstadoClass = (lineasPrep, totalLineas) => {
    if (lineasPrep === 0) return 'estado-pendiente'
    if (lineasPrep < totalLineas) return 'estado-parcial'
    return 'estado-preparado'
  }

  const lineasPendientes = lineas.filter(l => l.ESTADO_LINEA === 'PENDIENTE')
  const todasPreparadas = lineasPendientes.length === 0 && lineas.length > 0

  return (
    <div className="container">
      <h1>Pedidos - Granja Verde</h1>

      {/* Estadisticas */}
      <div className="stats-container">
        <div className="stat-card stat-clientes">
          <div className="stat-number">{stats.clientes_con_pedidos}</div>
          <div className="stat-label">Clientes</div>
        </div>
        <div className="stat-card stat-pendiente">
          <div className="stat-number">{stats.pedidos_pendientes}</div>
          <div className="stat-label">Pedidos Pend.</div>
        </div>
        <div className="stat-card stat-preparado">
          <div className="stat-number">{stats.pedidos_preparados}</div>
          <div className="stat-label">Preparados</div>
        </div>
        <div className="stat-card stat-entregado">
          <div className="stat-number">{stats.entregados_hoy}</div>
          <div className="stat-label">Entregados Hoy</div>
        </div>
      </div>

      {/* Filtros */}
      <form className="filtros" onSubmit={handleBuscar}>
        <div className="filtro-group">
          <label>Buscar cliente:</label>
          <input
            type="text"
            placeholder="Nombre del cliente..."
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          />
          <button type="submit" className="btn-buscar">Buscar</button>
        </div>
        <div className="filtro-info">
          {clientes.length} clientes con pedidos
        </div>
      </form>

      <div className="layout-container">
        {/* Lista de clientes */}
        <div className="clientes-list">
          <h2>Clientes con Pedidos</h2>
          {isLoading ? (
            <p>Cargando...</p>
          ) : clientes.length === 0 ? (
            <p className="no-data">No hay pedidos pendientes</p>
          ) : (
            <ul>
              {clientes.map(cliente => (
                <li
                  key={cliente.ID_CLIENTE}
                  className={`cliente-item ${selectedCliente?.ID_CLIENTE === cliente.ID_CLIENTE ? 'selected' : ''}`}
                  onClick={() => handleSelectCliente(cliente)}
                >
                  <div className="cliente-header">
                    <span className="cliente-nombre">{cliente.CLIENTE_NOMBRE}</span>
                    <span className={`cliente-estado ${getEstadoClass(parseInt(cliente.LINEAS_PREPARADAS), parseInt(cliente.TOTAL_LINEAS))}`}>
                      {cliente.LINEAS_PREPARADAS}/{cliente.TOTAL_LINEAS}
                    </span>
                  </div>
                  <div className="cliente-info">
                    <span>{cliente.CANTIDAD_PEDIDOS} pedido{cliente.CANTIDAD_PEDIDOS > 1 ? 's' : ''}</span>
                    <span>{cliente.TOTAL_LINEAS} items</span>
                  </div>
                  <div className="cliente-fecha">
                    Desde: {formatFecha(cliente.FECHA_PRIMER_PEDIDO)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detalle del cliente */}
        <div className="cliente-detalle">
          {selectedCliente ? (
            <>
              <h2>Pedidos de {selectedCliente.CLIENTE_NOMBRE}</h2>

              {/* Resumen de pedidos */}
              <div className="pedidos-resumen">
                <strong>{pedidos.length} pedido{pedidos.length > 1 ? 's' : ''}</strong>
                <span> - {lineas.length} lineas total</span>
                <span className="lineas-prep">
                  ({lineas.filter(l => l.ESTADO_LINEA === 'PREPARADO').length} preparadas)
                </span>
              </div>

              {/* Tabla de lineas */}
              <div className="lineas-header">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="btn-select-all"
                  disabled={lineasPendientes.length === 0}
                >
                  {selectedLineas.length === lineasPendientes.length && lineasPendientes.length > 0
                    ? 'Deseleccionar Todo'
                    : 'Seleccionar Pendientes'}
                </button>
                <span className="lineas-selected">
                  {selectedLineas.length} seleccionadas
                </span>
              </div>

              <table className="lineas-table">
                <thead>
                  <tr>
                    <th className="col-check"></th>
                    <th>Producto</th>
                    <th className="col-cantidad">Cant.</th>
                    <th className="col-unidades">Unidades</th>
                    <th className="col-estado">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map(linea => (
                    <tr
                      key={linea.ID_DETALLE}
                      className={`${linea.ESTADO_LINEA === 'PREPARADO' ? 'linea-preparada' : 'linea-clickeable'} ${selectedLineas.includes(linea.ID_DETALLE) ? 'linea-selected' : ''}`}
                      onClick={() => linea.ESTADO_LINEA !== 'PREPARADO' && handleToggleLinea(linea.ID_DETALLE)}
                    >
                      <td className="col-check">
                        <span className={`check-visual ${selectedLineas.includes(linea.ID_DETALLE) || linea.ESTADO_LINEA === 'PREPARADO' ? 'checked' : ''} ${linea.ESTADO_LINEA === 'PREPARADO' ? 'disabled' : ''}`}>
                          {selectedLineas.includes(linea.ID_DETALLE) || linea.ESTADO_LINEA === 'PREPARADO' ? '✓' : ''}
                        </span>
                      </td>
                      <td>{linea.ITEM_DESCRIPCION}</td>
                      <td className="col-cantidad">{linea.CANTIDAD}</td>
                      <td className="col-unidades">{linea.CANTIDAD_UNIDADES} u</td>
                      <td className="col-estado">
                        <span className={`estado-badge ${linea.ESTADO_LINEA === 'PREPARADO' ? 'estado-preparado' : 'estado-pendiente'}`}>
                          {linea.ESTADO_LINEA === 'PREPARADO' ? 'Listo' : 'Pend.'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Botones de accion */}
              <div className="acciones">
                <button
                  onClick={handlePrepararSeleccionados}
                  className="btn-preparar-sel"
                  disabled={isUpdating || selectedLineas.length === 0}
                >
                  {isUpdating ? 'Procesando...' : `Preparar Seleccionados (${selectedLineas.length})`}
                </button>

                <button
                  onClick={handlePrepararTodo}
                  className="btn-preparar-todo"
                  disabled={isUpdating || todasPreparadas}
                >
                  {isUpdating ? 'Procesando...' : 'Preparar Todo'}
                </button>

                <button
                  onClick={handleEntregarCliente}
                  className="btn-entregar"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Procesando...' : 'Marcar como ENTREGADO'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Seleccione un cliente de la lista para ver sus pedidos</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .container {
          max-width: 1400px;
          width: 95%;
        }

        .stats-container {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-card {
          flex: 1;
          padding: 15px;
          border-radius: 10px;
          text-align: center;
        }
        .stat-number {
          font-size: 32px;
          font-weight: bold;
        }
        .stat-label {
          font-size: 13px;
          margin-top: 5px;
        }
        .stat-clientes {
          background: #e3f2fd;
          color: #1565c0;
        }
        .stat-pendiente {
          background: #fff3cd;
          color: #856404;
        }
        .stat-preparado {
          background: #d1ecf1;
          color: #0c5460;
        }
        .stat-entregado {
          background: #d4edda;
          color: #155724;
        }

        .layout-container {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        .clientes-list {
          flex: 0 0 350px;
        }
        .cliente-detalle {
          flex: 1;
        }

        .filtros {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
          flex-wrap: wrap;
        }
        .filtro-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filtro-group input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          width: 200px;
        }
        .btn-buscar {
          padding: 8px 15px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .filtro-info {
          color: #666;
          font-size: 14px;
          margin-left: auto;
        }

        .clientes-list ul {
          list-style: none;
          padding: 0;
          max-height: 550px;
          overflow-y: auto;
        }
        .cliente-item {
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cliente-item:hover {
          border-color: #007bff;
          background: #f8f9fa;
        }
        .cliente-item.selected {
          border-color: #007bff;
          background: #e7f1ff;
        }
        .cliente-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .cliente-nombre {
          font-weight: bold;
          font-size: 16px;
        }
        .cliente-estado {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .estado-pendiente {
          background: #fff3cd;
          color: #856404;
        }
        .estado-parcial {
          background: #d1ecf1;
          color: #0c5460;
        }
        .estado-preparado {
          background: #d4edda;
          color: #155724;
        }
        .cliente-info {
          display: flex;
          justify-content: space-between;
          color: #666;
          font-size: 13px;
          margin-bottom: 5px;
        }
        .cliente-fecha {
          font-size: 12px;
          color: #999;
        }
        .no-data {
          color: #666;
          font-style: italic;
          text-align: center;
          padding: 40px;
        }

        /* Detalle */
        .pedidos-resumen {
          background: #f0f0f0;
          padding: 12px 15px;
          border-radius: 6px;
          margin-bottom: 15px;
        }
        .lineas-prep {
          color: #28a745;
        }

        .lineas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .btn-select-all {
          padding: 6px 12px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }
        .btn-select-all:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lineas-selected {
          color: #666;
          font-size: 13px;
        }

        .lineas-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .lineas-table th,
        .lineas-table td {
          padding: 10px 20px;
          border: 1px solid #ddd;
          text-align: left;
        }
        .lineas-table th {
          background: #f4f4f4;
          font-weight: bold;
        }
        .lineas-table .col-check {
          width: 50px;
          text-align: center;
        }
        .lineas-table .col-cantidad,
        .lineas-table .col-unidades {
          width: 90px;
          text-align: center;
          font-weight: bold;
        }
        .lineas-table .col-estado {
          width: 90px;
          text-align: center;
        }
        .lineas-table tr.linea-clickeable {
          cursor: pointer;
          transition: background 0.15s;
        }
        .lineas-table tr.linea-clickeable:hover {
          background: #f0f7ff;
        }
        .lineas-table tr.linea-selected {
          background: #e3f2fd !important;
        }
        .lineas-table tr.linea-preparada {
          background: #f0fff0;
          cursor: default;
        }
        .lineas-table tr.linea-preparada td {
          color: #666;
        }

        /* Check visual moderno */
        .check-visual {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 2px solid #ccc;
          border-radius: 6px;
          background: white;
          font-size: 16px;
          font-weight: bold;
          color: white;
          transition: all 0.15s;
        }
        .check-visual.checked {
          background: #17a2b8;
          border-color: #17a2b8;
        }
        .check-visual.disabled {
          background: #e9ecef;
          border-color: #dee2e6;
          color: #adb5bd;
        }
        .check-visual.disabled.checked {
          background: #28a745;
          border-color: #28a745;
          color: white;
        }

        .estado-badge {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }

        .acciones {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn-preparar-sel {
          flex: 1;
          padding: 12px;
          background: #17a2b8;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        }
        .btn-preparar-sel:hover:not(:disabled) {
          background: #138496;
        }
        .btn-preparar-todo {
          flex: 1;
          padding: 12px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        }
        .btn-preparar-todo:hover:not(:disabled) {
          background: #5a6268;
        }
        .btn-entregar {
          flex: 1;
          padding: 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        }
        .btn-entregar:hover:not(:disabled) {
          background: #218838;
        }
        .acciones button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        @media (max-width: 900px) {
          .layout-container {
            flex-direction: column;
          }
          .clientes-list {
            flex: none;
          }
          .stats-container {
            flex-wrap: wrap;
          }
          .stat-card {
            min-width: calc(50% - 10px);
          }
          .filtros {
            flex-direction: column;
            align-items: stretch;
          }
          .filtro-info {
            margin-left: 0;
            margin-top: 10px;
          }
          .acciones {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

export default Pedidos
