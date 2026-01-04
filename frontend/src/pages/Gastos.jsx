import { useState, useEffect } from 'react'

const API_URL = `http://${window.location.hostname}:3001/api/gastos`

function Gastos() {
  const [gastos, setGastos] = useState([])
  const [gastosPendientes, setGastosPendientes] = useState([])
  const [editandoId, setEditandoId] = useState(null)
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    moneda: 'UY$',
    metodo_pago: 'EFECTIVO',
    categoria: 'RACION',
    estado: 'PENDIENTE'
  })

  useEffect(() => {
    cargarGastos()
  }, [])

  const cargarGastos = async () => {
    try {
      const response = await fetch(API_URL)
      const data = await response.json()
      setGastos(data)
    } catch (error) {
      console.error('Error al cargar gastos:', error)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const nuevoGasto = {
      id: Date.now(),
      ...formData,
      monto: parseFloat(formData.monto)
    }

    setGastosPendientes([...gastosPendientes, nuevoGasto])
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      monto: '',
      moneda: 'UY$',
      metodo_pago: 'EFECTIVO',
      categoria: 'RACION',
      estado: 'PENDIENTE'
    })
  }

  const confirmarGastos = async () => {
    try {
      for (const gasto of gastosPendientes) {
        const { id, ...gastoData } = gasto
        await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gastoData),
        })
      }

      setGastosPendientes([])
      cargarGastos()
      alert('Gastos confirmados y guardados exitosamente')
    } catch (error) {
      console.error('Error al confirmar gastos:', error)
      alert('Error al guardar los gastos')
    }
  }

  const editarGastoPendiente = (id) => {
    const gasto = gastosPendientes.find(g => g.id === id)
    if (gasto) {
      setFormData({
        fecha: gasto.fecha,
        monto: gasto.monto.toString(),
        moneda: gasto.moneda,
        metodo_pago: gasto.metodo_pago,
        categoria: gasto.categoria,
        estado: gasto.estado
      })
      setEditandoId(id)
      eliminarGastoPendiente(id)
    }
  }

  const eliminarGastoPendiente = (id) => {
    setGastosPendientes(gastosPendientes.filter(g => g.id !== id))
  }

  const eliminarGasto = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        cargarGastos()
      }
    } catch (error) {
      console.error('Error al eliminar gasto:', error)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const calcularTotal = () => {
    return gastos.reduce((total, gasto) => total + parseFloat(gasto.MONTO || 0), 0).toFixed(2)
  }

  const calcularTotalPendientes = () => {
    return gastosPendientes.reduce((total, gasto) => total + parseFloat(gasto.monto || 0), 0).toFixed(2)
  }

  const formatearMoneda = (monto, moneda) => {
    return `${moneda}${parseFloat(monto).toFixed(2)}`
  }

  return (
    <div className="container">
      <h1>Gestión de Gastos - Granja Verde</h1>

      <form onSubmit={handleSubmit} className="form-gastos">
        <div className="form-row">
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="monto"
            placeholder="Monto"
            value={formData.monto}
            onChange={handleChange}
            step="0.01"
            required
          />

          <select
            name="moneda"
            value={formData.moneda}
            onChange={handleChange}
            required
          >
            <option value="US$">US$</option>
            <option value="UY$">UY$</option>
          </select>
        </div>

        <div className="form-row">
          <select
            name="metodo_pago"
            value={formData.metodo_pago}
            onChange={handleChange}
            required
          >
            <option value="CREDITO">Crédito</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="DEBITO">Débito</option>
          </select>

          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            required
          >
            <option value="UNIFORMES">Uniformes</option>
            <option value="PERSONAL">Personal</option>
            <option value="RACION">Ración</option>
            <option value="COMBUSTIBLE">Combustible</option>
            <option value="INSUMOS">Insumos</option>
            <option value="BARRACA">Barraca</option>
            <option value="ADMINISTRACION">Administración</option>
            <option value="SERVICE VEHICULOS">Service Vehículos</option>
            <option value="SEGUROS & PATENTE">Seguros & Patente</option>
            <option value="LUZ">Luz</option>
            <option value="INTERTNET">Internet</option>
            <option value="PAPELERIA">Papelería</option>
            <option value="VETERINARIA">Veterinaria</option>
          </select>

          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            required
          >
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <button type="submit">Agregar a Lista</button>
      </form>

      {gastosPendientes.length > 0 && (
        <div className="gastos-pendientes">
          <h2>Gastos Pendientes de Confirmar</h2>
          <ul className="lista-gastos">
            {gastosPendientes.map((gasto) => (
              <li key={gasto.id} className="gasto-item">
                <div className="gasto-info">
                  <div className="gasto-descripcion">
                    {gasto.categoria} - {gasto.metodo_pago}
                  </div>
                  <div className="gasto-detalles">
                    {new Date(gasto.fecha).toLocaleDateString()} | Estado: {gasto.estado}
                  </div>
                </div>
                <span className="gasto-monto">
                  {formatearMoneda(gasto.monto, gasto.moneda)}
                </span>
                <button
                  onClick={() => editarGastoPendiente(gasto.id)}
                  className="btn-editar"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminarGastoPendiente(gasto.id)}
                  className="btn-eliminar"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
          <div className="total">
            Total Pendiente: ${calcularTotalPendientes()}
          </div>
          <button onClick={confirmarGastos} className="btn-confirmar">
            Confirmar y Guardar Todos los Gastos
          </button>
        </div>
      )}
    </div>
  )
}

export default Gastos
