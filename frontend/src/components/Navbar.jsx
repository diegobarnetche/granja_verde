import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link'
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <img src="/logo.jpeg" alt="Granja Verde" className="navbar-logo" />
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
        <Link to="/ajustes-financieros" className={isActive('/ajustes-financieros')}>
          Ajustes Financieros
        </Link>
        <Link to="/pedidos" className={isActive('/pedidos')}>
          Pedidos
        </Link>
        <Link to="/cambios" className={isActive('/cambios')}>
          Cambios
        </Link>
      </div>
    </nav>

    <style>{`
      .navbar-brand {
        display: flex;
        align-items: center;
        gap: 15px;
      }

      .navbar-logo {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(255,255,255,0.3);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      @media (max-width: 768px) {
        .navbar-logo {
          width: 35px;
          height: 35px;
        }
      }
    `}</style>
  </>
  )
}

export default Navbar
