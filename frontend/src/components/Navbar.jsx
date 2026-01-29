import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link'
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>Granja Verde</h2>
      </div>
      <div className="navbar-links">
        <Link to="/ventas" className={isActive('/ventas')}>
          Ventas
        </Link>
        <Link to="/cobros" className={isActive('/cobros')}>
          Cobros
        </Link>
        <Link to="/gastos" className={isActive('/gastos')}>
          Gastos
        </Link>
        <Link to="/pago-obligaciones" className={isActive('/pago-obligaciones')}>
          Pago Obligaciones
        </Link>
        <Link to="/pedidos" className={isActive('/pedidos')}>
          Pedidos
        </Link>
        <Link to="/cambios" className={isActive('/cambios')}>
          Cambios
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
