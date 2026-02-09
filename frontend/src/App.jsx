import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Gastos from './pages/Gastos'
import PagoObligaciones from './pages/PagoObligaciones'
import Ventas from './pages/Ventas'
import Pedidos from './pages/Pedidos'
import Cobros from './pages/Cobros'
import Cambios from './pages/Cambios'
import AjustesFinancieros from './pages/AjustesFinancieros'
import Clientes from './pages/Clientes'

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/ventas" replace />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/pago-obligaciones" element={<PagoObligaciones />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/cobros" element={<Cobros />} />
            <Route path="/cambios" element={<Cambios />} />
            <Route path="/ajustes-financieros" element={<AjustesFinancieros />} />
            <Route path="/clientes" element={<Clientes />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
