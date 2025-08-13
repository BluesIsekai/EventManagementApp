import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import AdminProtected from '../components/ui/AdminProtected'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    receivedPayments: 0,
    requestedPayments: 0,
    inventoryItems: 0,
    inventoryReady: 0
  })
  const [recentPayments, setRecentPayments] = useState([])
  const [recentInventory, setRecentInventory] = useState([])

  useEffect(() => {
    // Listen to payments
    const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
    const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Set recent payments (limit to 5)
      setRecentPayments(payments.slice(0, 5))
      
      // Calculate stats
      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const receivedPayments = payments.filter(p => p.status === 'received').length
      const requestedPayments = payments.filter(p => p.status === 'requested').length
      
      setStats(prev => ({
        ...prev,
        totalPayments: payments.length,
        totalAmount,
        receivedPayments,
        requestedPayments
      }))
    })

    // Listen to inventory
    const inventoryQuery = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'), limit(5))
    const unsubInventory = onSnapshot(inventoryQuery, (snapshot) => {
      const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setRecentInventory(inventory)
      
      // Calculate inventory stats
      const totalItems = inventory.length
      const readyItems = inventory.filter(item => (item.qtyHave || 0) >= (item.qtyNeeded || 0)).length
      
      setStats(prev => ({
        ...prev,
        inventoryItems: totalItems,
        inventoryReady: readyItems
      }))
    })

    return () => {
      unsubPayments()
      unsubInventory()
    }
  }, [])

  return (
    <AdminProtected>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-4xl">👨‍💼</div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-lg text-gray-600">Manage payments, inventory, and event operations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Donations</p>
                <p className="text-2xl font-bold text-green-900">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Payments</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalPayments}</p>
                <p className="text-xs text-blue-600">{stats.receivedPayments} received, {stats.requestedPayments} pending</p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Inventory Items</p>
                <p className="text-2xl font-bold text-orange-900">{stats.inventoryItems}</p>
                <p className="text-xs text-orange-600">{stats.inventoryReady} ready</p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Event Status</p>
                <p className="text-lg font-bold text-purple-900">Active</p>
                <p className="text-xs text-purple-600">All systems operational</p>
              </div>
              <div className="text-3xl">🎉</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl bg-white border border-gray-200 shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">⚡ Admin Actions</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/admin/payments">
              <Button className="w-full justify-start gap-3 h-auto p-4 hover:scale-105 transition-transform">
                <div className="text-2xl">💳</div>
                <div className="text-left">
                  <div className="font-semibold">Manage Payments</div>
                  <div className="text-sm opacity-80">Process donations and UPI payments</div>
                </div>
              </Button>
            </Link>
            
            <Link to="/admin/inventory">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto p-4 hover:scale-105 transition-transform border-orange-300 hover:bg-orange-50">
                <div className="text-2xl">📋</div>
                <div className="text-left">
                  <div className="font-semibold">Inventory Management</div>
                  <div className="text-sm opacity-80">Track supplies and materials</div>
                </div>
              </Button>
            </Link>
            
            <Button variant="soft" className="w-full justify-start gap-3 h-auto p-4 hover:scale-105 transition-transform">
              <div className="text-2xl">📈</div>
              <div className="text-left">
                <div className="font-semibold">View Reports</div>
                <div className="text-sm opacity-80">Export data and analytics</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Payments */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">💰 Recent Payments</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentPayments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-3xl mb-2">📝</div>
                  <p>No payments yet</p>
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{payment.donor}</div>
                        <div className="text-sm text-gray-500">
                          {payment.createdAt && new Date(payment.createdAt.seconds * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">₹{(payment.amount || 0).toLocaleString()}</div>
                        <Badge color={payment.status === 'received' ? 'green' : 'yellow'}>
                          {payment.status === 'received' ? 'Received' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {recentPayments.length > 0 && (
              <div className="bg-gray-50 px-6 py-3 border-t">
                <Link to="/admin/payments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View all payments →
                </Link>
              </div>
            )}
          </div>

          {/* Recent Inventory */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">📦 Recent Inventory</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentInventory.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-3xl mb-2">📋</div>
                  <p>No inventory items yet</p>
                </div>
              ) : (
                recentInventory.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.qtyHave || 0} of {item.qtyNeeded || 0} available
                        </div>
                      </div>
                      <div>
                        <Badge color={(item.qtyHave || 0) >= (item.qtyNeeded || 0) ? 'green' : 'yellow'}>
                          {(item.qtyHave || 0) >= (item.qtyNeeded || 0) ? 'Ready' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {recentInventory.length > 0 && (
              <div className="bg-gray-50 px-6 py-3 border-t">
                <Link to="/admin/inventory" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View all inventory →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminProtected>
  )
}
