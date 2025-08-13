import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Payments from './pages/Payments'
import Inventory from './pages/Inventory'
import UserPayment from './pages/UserPayment'
import AdminDashboard from './pages/AdminDashboard'
import AdminProtected from './components/ui/AdminProtected'
import { AdminProvider, useAdmin } from './contexts/AdminContext'

function AppHeader() {
  const location = useLocation()
  const { logout } = useAdmin()
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return (
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">👨‍💼</div>
            <h1 className="text-xl font-semibold">Admin Panel</h1>
          </div>
          <nav className="flex gap-4 text-sm">
            <NavLink to="/admin" end className={({isActive}) => `px-3 py-2 rounded ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/payments" className={({isActive}) => `px-3 py-2 rounded ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>
              Payments
            </NavLink>
            <NavLink to="/admin/inventory" className={({isActive}) => `px-3 py-2 rounded ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>
              Inventory
            </NavLink>
            <button 
              onClick={logout}
              className="px-3 py-2 rounded text-red-600 hover:bg-red-50 border border-red-200"
            >
              🔒 Logout
            </button>
            <NavLink to="/" className="px-3 py-2 rounded text-blue-600 hover:bg-blue-50 border border-blue-200">
              Public View
            </NavLink>
          </nav>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 text-white shadow-lg">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🙏</div>
          <h1 className="text-xl font-semibold">Ganesh Chaturthi 2025</h1>
        </div>
        <nav className="flex gap-1">
          <NavLink 
            to="/admin" 
            className="px-3 py-2 rounded text-xs bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            🔐 Admin
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

function AppRoutes() {
  return (
    <main>
      <Routes>
        {/* Public routes - User Payment Interface */}
        <Route index element={<UserPayment />} />
        
        {/* Admin routes - Protected */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/payments" element={
          <div className="mx-auto max-w-6xl p-4">
            <AdminProtected>
              <Payments />
            </AdminProtected>
          </div>
        } />
        <Route path="/admin/inventory" element={
          <div className="mx-auto max-w-6xl p-4">
            <AdminProtected>
              <Inventory />
            </AdminProtected>
          </div>
        } />
      </Routes>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <AppHeader />
          <AppRoutes />
        </div>
      </AdminProvider>
    </BrowserRouter>
  )
}
