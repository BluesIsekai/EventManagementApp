import { useEffect, useMemo, useState } from 'react'
import { ArrowDownTrayIcon, CheckCircleIcon, TrashIcon, QrCodeIcon, KeyIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Build UPI params and links
function upiQuery({ upiId, name, amount, note }) {
  const params = new URLSearchParams()
  if (upiId && String(upiId).trim()) params.set('pa', String(upiId).trim())
  if (name && String(name).trim()) params.set('pn', String(name).trim())
  const amt = Number(amount)
  if (!Number.isNaN(amt) && amt > 0) params.set('am', (Math.round(amt * 100) / 100).toFixed(2))
  if (note && String(note).trim()) params.set('tn', String(note).trim())
  params.set('cu', 'INR')
  return params.toString()
}

function upiPayUrl(args){ return `upi://pay?${upiQuery(args)}` }
function gpayIntentUrl(args){
  const fallback = encodeURIComponent(upiPayUrl(args))
  return `intent://upi/pay?${upiQuery(args)}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=${fallback};end`
}

export default function Payments() {
  const [donor, setDonor] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [upiId, setUpiId] = useState('') // Will be loaded from Firestore
  const [note, setNote] = useState('Ganesh Chaturthi 2025')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [mode, setMode] = useState('upi') // 'upi' | 'cash'
  function todayStr(){ return new Date().toISOString().slice(0,10) }
  const [paidAt, setPaidAt] = useState(todayStr()) // ISO date string (YYYY-MM-DD)
  const [statusFilter, setStatusFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setItems(list)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Load app settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'app')
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data()
          console.log('Loaded settings:', settings)
          if (settings.upiId) {
            setUpiId(settings.upiId)
          }
        } else {
          // Create default settings document
          const defaultUpiId = 'joshitanishq9@okhdfcbank' // Set your default UPI ID
          console.log('Creating default settings with UPI ID:', defaultUpiId)
          
          await setDoc(settingsRef, {
            upiId: defaultUpiId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          setUpiId(defaultUpiId)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        
        // More specific error handling
        if (error.code === 'permission-denied') {
          console.warn('Firestore permission denied, using localStorage fallback')
        } else if (error.code === 'unavailable') {
          console.warn('Firestore unavailable, using localStorage fallback')
        }
        
        // Fallback to localStorage if Firestore fails
        const saved = localStorage.getItem('upiId')
        if (saved) {
          console.log('Using localStorage UPI ID:', saved)
          setUpiId(saved)
        } else {
          // Set default if nothing exists
          const defaultUpiId = 'joshitanishq9@okhdfcbank'
          setUpiId(defaultUpiId)
          localStorage.setItem('upiId', defaultUpiId)
        }
      }
      setSettingsLoading(false)
    }
    
    loadSettings()
  }, [])

  // Save UPI ID to Firestore when changed by admin
  const saveUpiIdToFirestore = async (newUpiId) => {
    if (!isAdmin) {
      alert('Only admins can save UPI ID')
      return
    }
    
    if (!newUpiId || !newUpiId.trim()) {
      alert('Please enter a valid UPI ID')
      return
    }
    
    try {
      const settingsRef = doc(db, 'settings', 'app')
      await setDoc(settingsRef, {
        upiId: newUpiId.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      // Also save to localStorage as backup
      localStorage.setItem('upiId', newUpiId.trim())
      
      alert('UPI ID saved successfully!')
    } catch (error) {
      console.error('Error saving UPI ID:', error)
      
      // More specific error messages
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please check Firestore security rules.')
      } else if (error.code === 'unavailable') {
        alert('Firestore is currently unavailable. Please try again later.')
      } else {
        alert(`Failed to save UPI ID: ${error.message}`)
      }
    }
  }
  // Do not persist admin mode; every load starts as non-admin

  const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || ''
  function adminLogin() {
    const code = window.prompt('Enter admin code')
    if (!code) return
    if (ADMIN_CODE && code === ADMIN_CODE) {
      setIsAdmin(true)
    } else if (!ADMIN_CODE) {
      // If no code configured, allow enabling for local/testing
      setIsAdmin(true)
    } else {
      alert('Invalid code')
    }
  }
  function adminLogout() { setIsAdmin(false) }

  function isValidUpiId(v){
    const s = String(v || '').trim()
    if (!s) return false
    // Simple heuristic: local-part@provider
    return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}$/.test(s)
  }
  function isValidAmount(v){
    const n = Number(v)
    return Number.isFinite(n) && n > 0
  }

  async function savePayment(status = 'received', paymentMode = mode) {
    if (!donor || !amount) return
    if (!paidAt) { alert('Paid date is required'); return }
    await addDoc(collection(db, 'payments'), {
      donor,
      email,
      amount: Number(amount),
      note,
      mode: paymentMode,
      paidAt: paidAt ? new Date(paidAt) : null,
      status,
      createdAt: serverTimestamp(),
    })
    setDonor('')
    setEmail('')
    setAmount('')
    setPaidAt(todayStr())
  }

  async function recordCashPayment() {
    if (!donor || !amount) {
      alert('Please enter donor name and amount')
      return
    }
    await savePayment('requested', 'cash')
  }
  
  // Helper to create a 'requested' payment record in Firestore
  async function createRequestedPayment() {
    if (donor && isValidAmount(amount)) {
      try {
        await addDoc(collection(db, 'payments'), {
          donor,
          email,
          amount: Number(amount),
          note,
          mode: 'upi',
          paidAt: null,
          status: 'requested',
          createdAt: serverTimestamp(),
        });
        // Clear fields after navigation is triggered
        setTimeout(() => { setDonor(''); setEmail(''); setAmount(''); setPaidAt(todayStr()) }, 300);
      } catch (error) {
        console.error("Failed to create requested payment:", error);
      }
    }
  }

  const upiUrl = useMemo(() => upiPayUrl({ upiId, amount, note }), [upiId, amount, note])
  const intentUrl = useMemo(() => gpayIntentUrl({ upiId, amount, note }), [upiId, amount, note])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const okStatus = statusFilter === 'all' ? true : i.status === statusFilter
      const okMode = modeFilter === 'all' ? true : (i.mode || 'upi') === modeFilter
      return okStatus && okMode
    })
  }, [items, statusFilter, modeFilter])

  const total = filtered.reduce((s, i) => s + (i.amount || 0), 0)

  async function toggleReceived(item) {
    if (!isAdmin) return
    const ref = doc(db, 'payments', item.id)
    await updateDoc(ref, { status: item.status === 'received' ? 'requested' : 'received' })
  }

  async function removePayment(item) {
    if (!isAdmin) return
    const ref = doc(db, 'payments', item.id)
    await deleteDoc(ref)
  }

  function exportCsv() {
    const headers = ['Donor','Email','Amount','Mode','Status','Note','PaidAt']
    const rows = filtered.map(i => [
      safe(i.donor),
      safe(i.email),
      i.amount ?? '',
      i.mode ?? '',
      i.status ?? '',
      safe(i.note),
      i.paidAt ? new Date(i.paidAt.seconds ? i.paidAt.seconds*1000 : i.paidAt).toISOString() : ''
    ])
    const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    function safe(v){ return (v ?? '').toString() }
    function csvCell(v){
      const s = (v ?? '').toString()
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"'
      return s
    }
  }

  function initiateUpiPayment() {
    if (!isValidUpiId(upiId)) { alert('Please set a valid UPI ID first (e.g. name@bank)'); return }
    if (!isValidAmount(amount)) { alert('Please enter a valid amount greater than 0'); return }
    
    // Create the 'requested' record before attempting navigation
    createRequestedPayment();
    
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isAndroid) {
      // Use the robust intent URL. It prefers GPay and falls back to the system chooser.
      window.location.href = intentUrl;
    } else if (isMobile) {
      // For iOS and other mobile OS, use the generic UPI link to open the system chooser.
      window.location.href = upiUrl;
    } else {
      // For desktop, show the QR code modal.
      setShowQR(true);
    }
  }

  const countReceived = filtered.filter(i => i.status === 'received').length
  const countRequested = filtered.filter(i => i.status === 'requested').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-4">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header Section with Stats */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">💰 Payments</h2>
            <p className="text-lg text-gray-600">Collect via UPI, track donations, and reconcile when received.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge color="emerald" className="text-base px-4 py-2 shadow-sm">Total ₹{total.toLocaleString()}</Badge>
            <Badge color="yellow" className="text-base px-4 py-2 shadow-sm">Requested {countRequested}</Badge>
            <Badge color="green" className="text-base px-4 py-2 shadow-sm">Received {countReceived}</Badge>
          </div>
        </div>

        {/* Admin Controls */}
        <div className="flex items-center gap-3 text-sm">
          {isAdmin ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 font-medium text-green-700 shadow-sm">
                ✨ Admin mode
              </span>
              <Button variant="outline" onClick={adminLogout} className="hover:scale-105 transition-transform">
                Logout
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={adminLogin} className="hover:scale-105 transition-transform">
              <KeyIcon className="h-4 w-4" /> Admin login
            </Button>
          )}
        </div>

        {/* UPI Configuration */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-orange-100 shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏦 Payment Configuration</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Receiver UPI ID</span>
              {isAdmin ? (
                <div className="space-y-2">
                  <Input 
                    value={upiId} 
                    onChange={e=>setUpiId(e.target.value)}
                    placeholder="name@bank"
                    className="mt-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <Button 
                    variant="outline" 
                    onClick={()=>saveUpiIdToFirestore(upiId)}
                    className="text-xs px-3 py-1 hover:scale-105 transition-transform"
                  >
                    💾 Save UPI ID
                  </Button>
                </div>
              ) : (
                <div className="mt-2 w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-gray-700">
                  {settingsLoading ? 'Loading...' : (upiId || 'Not set')}
                  <span className="ml-2 align-middle text-xs text-gray-500">(admin only)</span>
                </div>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Payment Note</span>
              <Input 
                value={note} 
                onChange={e=>setNote(e.target.value)} 
                placeholder="Purpose"
                className="mt-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </label>
          </div>
        </div>

        {/* Payment Form */}
        <div className="rounded-2xl bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 shadow-xl p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            💸 New Payment
          </h3>
          
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Donor Name *</span>
              <Input 
                value={donor} 
                onChange={e=>setDonor(e.target.value)} 
                placeholder="e.g. Your Name"
                className="mt-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/80"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email Address</span>
              <Input 
                type="email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                placeholder="email@example.com"
                className="mt-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/80"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Amount (INR) *</span>
              <Input 
                type="number" 
                value={amount} 
                onChange={e=>setAmount(e.target.value)} 
                placeholder="500"
                className="mt-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/80"
              />
            </label>
            <div className="flex items-end">
              <div className="w-full space-y-2">
                <span className="text-sm font-medium text-gray-700">Quick Actions</span>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="success" 
                    onClick={initiateUpiPayment}
                    className="hover:scale-105 transition-transform shadow-md"
                  >
                    <CreditCardIcon className="h-4 w-4" /> Pay via UPI
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={recordCashPayment}
                    className="hover:scale-105 transition-transform shadow-md bg-white/80"
                  >
                    <BanknotesIcon className="h-4 w-4" /> Record Cash
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => { if (isValidAmount(amount)) setShowQR(true); else alert('Please enter a valid amount'); }}
              className="hover:scale-105 transition-transform shadow-md bg-white/80"
            >
              <QrCodeIcon className="h-4 w-4" /> Show QR Code
            </Button>
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => savePayment('received')}
                className="hover:scale-105 transition-transform shadow-md bg-white/80"
              >
                <CheckCircleIcon className="h-4 w-4" /> Mark as Received
              </Button>
            )}
          </div>
        </div>

        {/* Admin Payment Mode Selection */}
        {isAdmin && (
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Admin Settings</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Payment Mode</span>
                <Select 
                  value={mode} 
                  onChange={e=>setMode(e.target.value)}
                  className="mt-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                </Select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Payment Date</span>
                <Input 
                  type="date" 
                  value={paidAt} 
                  onChange={e=>setPaidAt(e.target.value)} 
                  required
                  className="mt-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </label>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 bg-white/60 rounded-lg p-3">
          💡 Tip: On Android, this opens the Google Pay app directly. On other devices, it opens any installed UPI app via the generic UPI link.
        </p>

        {/* Payments List */}
        <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-gray-50 to-gray-100">
            <h3 className="text-xl font-semibold text-gray-900">📊 Payment Records</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-gray-600 font-medium">Filters:</span>
              <Select 
                className="w-auto focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                value={statusFilter} 
                onChange={e=>setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="requested">Requested</option>
                <option value="received">Received</option>
              </Select>
              <Select 
                className="w-auto focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                value={modeFilter} 
                onChange={e=>setModeFilter(e.target.value)}
              >
                <option value="all">All modes</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
              </Select>
              <div className="ml-auto flex items-center gap-3">
                <div className="text-gray-700 font-semibold">Total: ₹{total.toLocaleString()}</div>
                <Button 
                  variant="outline" 
                  onClick={exportCsv}
                  className="hover:scale-105 transition-transform shadow-md"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {loading && (
              <div className="p-6 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-sm text-gray-500">Loading payments...</div>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📝</div>
                <div className="text-lg text-gray-500">No payments found</div>
                <div className="text-sm text-gray-400">Start by adding your first payment above</div>
              </div>
            )}
            {filtered.map((item, index) => (
              <div 
                key={item.id} 
                className={`grid grid-cols-2 items-center gap-3 p-4 text-sm sm:grid-cols-8 transition-colors hover:bg-orange-50/50 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                <div className="font-semibold text-gray-900">{item.donor}</div>
                <div className="text-gray-600 truncate">{item.email || '-'}</div>
                <div className="font-bold text-green-600">₹{(item.amount || 0).toLocaleString()}</div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  item.mode === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {item.mode === 'cash' ? '💵 Cash' : '📱 UPI'}
                </div>
                <div className="text-gray-600">
                  {item.paidAt ? new Date(item.paidAt.seconds ? item.paidAt.seconds*1000 : item.paidAt).toLocaleDateString() : '-'}
                </div>
                <div className="text-gray-600 truncate">{item.note}</div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium shadow-sm ${
                    item.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status === 'received' ? '✅ Received' : '⏳ Requested'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="px-3 py-1 text-xs hover:scale-105 transition-transform" 
                      onClick={()=>toggleReceived(item)}
                    >
                      {item.status === 'received' ? 'Undo' : 'Confirm'}
                    </Button>
                    <Button 
                      variant="danger" 
                      className="px-2 py-1 text-xs hover:scale-105 transition-transform" 
                      onClick={()=>removePayment(item)}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* QR Code Modal */}
        <Modal open={showQR} onClose={()=>setShowQR(false)} title="📱 Scan to Pay (UPI)">
          <div className="flex flex-col items-center gap-4 p-4">
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`}
                alt="UPI QR Code"
                className="h-60 w-60 rounded-xl"
              />
            </div>
            <div className="w-full break-all rounded-lg bg-gray-100 p-3 text-xs text-gray-700 font-mono">
              {upiUrl}
            </div>
            <Button 
              onClick={()=>{ navigator.clipboard?.writeText(upiUrl) }}
              className="hover:scale-105 transition-transform"
            >
              📋 Copy UPI Link
            </Button>
            <p className="mt-2 text-center text-sm text-gray-500">
              Open your UPI app and choose "Scan & Pay", or copy the link if scanning isn't available.
            </p>
          </div>
        </Modal>
      </div>
    </div>
  )
}
