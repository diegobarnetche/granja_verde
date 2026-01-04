import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:3001/api/gastos'

function App() {
  const [gastos, setGastos] = useState([])
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          monto: parseFloat(formData.monto)
        }),
      })

      if (response.ok) {
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          monto: '',
          moneda: 'UY$',
          metodo_pago: 'EFECTIVO',
          categoria: 'RACION',
          estado: 'PENDIENTE'
        })
        cargarGastos()
      }
    } catch (error) {
      console.error('Error al agregar gasto:', error)
    }
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

        <button type="submit">Agregar Gasto</button>
      </form>

      {gastos.length === 0 ? (
        <p className="mensaje">No hay gastos registrados</p>
      ) : (
        <>
          <ul className="lista-gastos">
            {gastos.map((gasto) => (
              <li key={gasto.ID_GASTO} className="gasto-item">
                <div className="gasto-info">
                  <div className="gasto-descripcion">
                    {gasto.CATEGORIA} - {gasto.METODO_PAGO}
                  </div>
                  <div className="gasto-detalles">
                    {new Date(gasto.FECHA).toLocaleDateString()} | Estado: {gasto.ESTADO}
                  </div>
                </div>
                <span className="gasto-monto">
                  {formatearMoneda(gasto.MONTO, gasto.MONEDA)}
                </span>
                <button
                  onClick={() => eliminarGasto(gasto.ID_GASTO)}
                  className="btn-eliminar"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>

          <div className="total">
            Total: ${calcularTotal()}
          </div>
        </>
      )}
    </div>
  )
}

export default App
