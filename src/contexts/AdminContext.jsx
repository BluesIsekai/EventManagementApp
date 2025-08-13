import { createContext, useContext, useState } from 'react'

const AdminContext = createContext()

export function AdminProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)

  const login = () => {
    setIsAdminAuthenticated(true)
  }

  const logout = () => {
    setIsAdminAuthenticated(false)
  }

  return (
    <AdminContext.Provider value={{
      isAdminAuthenticated,
      login,
      logout
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
