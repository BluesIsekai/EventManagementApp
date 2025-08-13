import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Payments from './pages/Payments'
import Inventory from './pages/Inventory'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Ganesh Chaturthi</h1>
            <nav className="flex gap-4 text-sm">
              <NavLink to="/" end className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>Dashboard</NavLink>
              <NavLink to="/payments" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>Payments</NavLink>
              <NavLink to="/inventory" className={({isActive}) => `px-2 py-1 rounded ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>Inventory</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4">
          <Routes>
            <Route index element={<div className="space-y-4">
              <h2 className="text-2xl font-semibold">Dashboard</h2>
            </div>} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/inventory" element={<Inventory />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
