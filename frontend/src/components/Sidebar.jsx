import { Link, useLocation } from 'react-router-dom'

function Sidebar() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'sidebar-link active' : 'sidebar-link'
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h4>Módulos Adicionales</h4>
        </div>
        <div className="sidebar-content">
          <Link to="/clientes" className={isActive('/clientes')}>
            <span className="icon">👥</span>
            <span>Clientes</span>
          </Link>
        </div>
      </aside>

      <style>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 60px; /* Debajo del navbar */
          width: 200px;
          height: calc(100vh - 60px);
          background: linear-gradient(180deg, #2c5f2d 0%, #1e4620 100%);
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          z-index: 999;
          overflow-y: auto;
        }

        .sidebar-header {
          padding: 20px;
          text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.1);
        }

        .sidebar-header h4 {
          margin: 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .sidebar-content {
          flex: 1;
          padding: 10px 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          transition: all 0.3s ease;
          font-size: 15px;
          border-left: 3px solid transparent;
        }

        .sidebar-link .icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }

        .sidebar-link:hover {
          background: rgba(255,255,255,0.1);
          color: white;
          border-left-color: rgba(255,255,255,0.5);
        }

        .sidebar-link.active {
          background: rgba(255,255,255,0.15);
          color: white;
          font-weight: 600;
          border-left-color: #90EE90;
        }

        .sidebar-hint {
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          text-align: center;
          font-style: italic;
          line-height: 1.6;
          padding: 20px;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

export default Sidebar
