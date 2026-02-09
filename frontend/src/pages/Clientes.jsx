import { useState, useEffect } from 'react'

const API_URL = `/api/clientes`

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    empresa: ''
  })

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(API_URL)
      const data = await response.json()
      setClientes(data)
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      alert('Error al cargar clientes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const resetFormulario = () => {
    setFormData({
      nombre: '',
      apellido: '',
      telefono: '',
      direccion: '',
      empresa: ''
    })
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validaciones básicas
    if (!formData.nombre.trim()) {
      alert('El nombre es obligatorio')
      return
    }
    if (!formData.telefono.trim()) {
      alert('El teléfono es obligatorio')
      return
    }

    setIsSubmitting(true)

    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details?.join(', ') || 'Error desconocido')
      }

      alert(result.message)
      resetFormulario()
      cargarClientes()

    } catch (error) {
      console.error('Error al guardar cliente:', error)
      alert('Error al guardar cliente: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (cliente) => {
    setFormData({
      nombre: cliente.NOMBRE || '',
      apellido: cliente.APELLIDO || '',
      telefono: cliente.TELEFONO || '',
      direccion: cliente.DIRECCION || '',
      empresa: cliente.EMPRESA || ''
    })
    setEditingId(cliente.ID_CLIENT)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    resetFormulario()
  }

  return (
    <div className="container">
      <h1>Gestión de Clientes</h1>

      {/* FORMULARIO */}
      <form onSubmit={handleSubmit} className="form-gastos">
        <h2>{editingId ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h2>

        <div className="form-row">
          <div className="form-group">
            <label>Nombre *</label>
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Apellido</label>
            <input
              type="text"
              name="apellido"
              placeholder="Apellido (opcional)"
              value={formData.apellido}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Teléfono *</label>
            <input
              type="text"
              name="telefono"
              placeholder="Teléfono"
              value={formData.telefono}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              name="direccion"
              placeholder="Dirección (opcional)"
              value={formData.direccion}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Empresa</label>
            <input
              type="text"
              name="empresa"
              placeholder="Empresa (opcional)"
              value={formData.empresa}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-buttons">
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : (editingId ? 'Actualizar Cliente' : 'Agregar Cliente')}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancelEdit} className="btn-cancel">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA DE CLIENTES */}
      <div className="clientes-section">
        <h2>Lista de Clientes ({clientes.length})</h2>

        {isLoading ? (
          <p className="mensaje">Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <p className="mensaje">No hay clientes registrados</p>
        ) : (
          <div className="table-container">
            <table className="clientes-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Empresa</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(cliente => (
                  <tr key={cliente.ID_CLIENT}>
                    <td>{cliente.ID_CLIENT}</td>
                    <td><strong>{cliente.NOMBRE}</strong></td>
                    <td>{cliente.APELLIDO || '-'}</td>
                    <td>{cliente.TELEFONO}</td>
                    <td>{cliente.DIRECCION || '-'}</td>
                    <td>{cliente.EMPRESA || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleEdit(cliente)}
                        className="btn-editar"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .form-group {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 200px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
        }

        .form-group input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
        }

        .form-buttons {
          display: flex;
          gap: 10px;
        }

        .btn-submit {
          flex: 1;
          padding: 12px 20px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }

        .btn-submit:hover {
          background-color: #45a049;
        }

        .btn-submit:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-cancel {
          padding: 12px 20px;
          background-color: #999;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }

        .btn-cancel:hover {
          background-color: #777;
        }

        .clientes-section {
          margin-top: 40px;
        }

        .clientes-section h2 {
          color: #2e7d32;
          margin-bottom: 20px;
        }

        .table-container {
          overflow-x: auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .clientes-table {
          width: 100%;
          border-collapse: collapse;
        }

        .clientes-table th,
        .clientes-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .clientes-table th {
          background-color: #f5f5f5;
          font-weight: 600;
          color: #333;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .clientes-table tbody tr:hover {
          background-color: #f9f9f9;
        }

        .clientes-table td strong {
          color: #2e7d32;
        }

        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
          }

          .table-container {
            overflow-x: scroll;
          }

          .clientes-table {
            font-size: 13px;
          }

          .clientes-table th,
          .clientes-table td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  )
}

export default Clientes
