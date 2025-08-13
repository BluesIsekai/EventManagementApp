import { useState } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import Button from './Button'
import Input from './Input'

export default function AdminProtected({ children, onSuccess }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const { isAdminAuthenticated, login } = useAdmin()

  const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'ganesh123'

  function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) {
      setError('Please enter the admin code')
      return
    }
    
    if (code === ADMIN_CODE) {
      login()
      setError('')
      if (onSuccess) onSuccess()
    } else {
      setError('Invalid admin code. Please try again.')
      setCode('')
    }
  }

  if (isAdminAuthenticated) {
    return children
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="text-6xl">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Access Required</h2>
          <p className="text-gray-600">Please enter the admin code to access this section.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Code
            </label>
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter admin code"
              className="w-full"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
          
          <Button type="submit" className="w-full">
            🔓 Unlock Admin Access
          </Button>
        </form>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            This section contains sensitive administrative functions.
          </p>
        </div>
      </div>
    </div>
  )
}
