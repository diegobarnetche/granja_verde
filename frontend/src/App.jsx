import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Gastos from './pages/Gastos'
import Ventas from './pages/Ventas'
import Pedidos from './pages/Pedidos'

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/gastos" replace />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/pedidos" element={<Pedidos />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
