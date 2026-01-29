import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Gastos from './pages/Gastos'
import PagoObligaciones from './pages/PagoObligaciones'
import Ventas from './pages/Ventas'
import Pedidos from './pages/Pedidos'
import Cobros from './pages/Cobros'
import Cambios from './pages/Cambios'

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/ventas" replace />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/pago-obligaciones" element={<PagoObligaciones />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/cobros" element={<Cobros />} />
          <Route path="/cambios" element={<Cambios />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
