import { useEffect, useMemo, useState } from 'react'
import { ArrowDownTrayIcon, CheckCircleIcon, TrashIcon, QrCodeIcon, KeyIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/u          <p className="mt-1 text-center text-xs text-gray-500">Open your UPI app and choose "Scan & Pay", or copy the link if scanning isn't available.</p>
        </div>
      </Modal>
      </div>
    </div>
  )
}e'
import Modal from '../components/ui/Modal'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'
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
  const [upiId, setUpiId] = useState('joshitanishq9@okhdfcbank') // TODO: set your real UPI ID
  const [note, setNote] = useState('Ganesh Chaturthi 2025')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
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

  // Persist UPI ID locally so you don't have to retype
  useEffect(() => {
    const saved = localStorage.getItem('upiId')
    if (saved) setUpiId(saved)
  }, [])
  useEffect(() => {
    if (upiId) localStorage.setItem('upiId', upiId)
  }, [upiId])

  const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || ''
  function adminLogin() {
    const code = window.prompt('Enter admin code')
    if (!code) return
    if (ADMIN_CODE && code === ADMIN_CODE) {
      setIsAdmin(true)
    } else if (!ADMIN_CODE) {
      setIsAdmin(true)
    } else {
      alert('Invalid code')
    }
  }
  function adminLogout() { setIsAdmin(false) }

  function isValidUpiId(v){
    const s = String(v || '').trim()
    if (!s) return false
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
    await savePayment('received', 'cash')
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">💰 Payments</h2>
            <p className="text-lg text-gray-600">Collect via UPI, track donations, and reconcile when received.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge color="emerald" className="text-base px-4 py-2">Total ₹{total.toLocaleString()}</Badge>
            <Badge color="yellow" className="text-base px-4 py-2">Requested {countRequested}</Badge>
            <Badge color="green" className="text-base px-4 py-2">Received {countReceived}</Badge>
          </div>
        </div>

      <div className="flex items-center gap-3 text-sm">
        {isAdmin ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">Admin mode</span>
            <button className="rounded-lg border px-3 py-1.5 hover:bg-gray-50" onClick={adminLogout}>Logout</button>
          </>
        ) : (
          <Button variant="outline" onClick={adminLogin}><KeyIcon className="h-4 w-4" /> Admin login</Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-gray-600">Receiver UPI ID</span>
          {isAdmin ? (
            <Input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="name@bank" />
          ) : (
            <div className="mt-1 w-full rounded-lg border border-dashed bg-gray-50 px-3 py-2 text-gray-700">
              {upiId || 'Not set'}
              <span className="ml-2 align-middle text-xs text-gray-500">(admin only)</span>
            </div>
          )}
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Note</span>
          <Input value={note} onChange={e=>setNote(e.target.value)} placeholder="Purpose" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 rounded-xl border bg-white/80 p-3 shadow-sm">
        <label className="block">
          <span className="text-sm text-gray-600">Donor Name</span>
          <Input value={donor} onChange={e=>setDonor(e.target.value)} placeholder="e.g. Rahul" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Amount (INR)</span>
          <Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="500" />
        </label>
        <div className="flex items-end gap-2">
          {/* == MODIFIED PART START == */}
          <Button variant="success" onClick={initiateUpiPayment}>
            <CreditCardIcon className="h-5 w-5" /> Pay via UPI
          </Button>
          <Button variant="outline" onClick={() => { if (isValidAmount(amount)) setShowQR(true); else alert('Please enter a valid amount'); }}>
            <QrCodeIcon className="h-5 w-5" /> Show QR
          </Button>
          <Button variant="outline" onClick={recordCashPayment}>
            <BanknotesIcon className="h-5 w-5" /> Record Cash
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => savePayment('received')}><CheckCircleIcon className="h-5 w-5" /> Mark Received</Button>
          )}
          {/* == MODIFIED PART END == */}
        </div>
      </div>
      
      {/* The cash/other payment form */}
      {isAdmin && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm text-gray-600">Mode</span>
            <Select value={mode} onChange={e=>setMode(e.target.value)}>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
            </Select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Paid date</span>
            <Input type="date" value={paidAt} onChange={e=>setPaidAt(e.target.value)} required />
          </label>
        </div>
      )}

      {/* == MODIFIED HELPER TEXT == */}
      <p className="text-xs text-gray-500">Tip: On Android, this will try to open Google Pay and fall back to other UPI apps. On other devices, it will open the system UPI app chooser.</p>

      <div className="rounded-xl border bg-white/80 shadow-sm">
        <div className="flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold">Payments</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Filters:</span>
            <Select className="w-auto" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="requested">Requested</option>
              <option value="received">Received</option>
            </Select>
            <Select className="w-auto" value={modeFilter} onChange={e=>setModeFilter(e.target.value)}>
              <option value="all">All modes</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
            </Select>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-gray-600">Total: ₹{total}</div>
              <Button variant="outline" onClick={exportCsv}><ArrowDownTrayIcon className="h-4 w-4" /> Export CSV</Button>
            </div>
          </div>
        </div>
        <div className="divide-y">
          {loading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="p-3 text-sm text-gray-500">No payments</div>}
          {filtered.map(item => (
            <div key={item.id} className="grid grid-cols-2 items-center gap-2 p-3 text-sm sm:grid-cols-8 odd:bg-gray-50/60">
              <div className="font-medium">{item.donor}</div>
              <div className="text-gray-600 truncate">{item.email || '-'}</div>
              <div>₹{item.amount}</div>
              <div className="text-gray-600">{item.mode || 'upi'}</div>
              <div className="text-gray-600">{item.paidAt ? new Date(item.paidAt.seconds ? item.paidAt.seconds*1000 : item.paidAt).toLocaleDateString() : '-'}</div>
              <div className="text-gray-600">{item.note}</div>
              <div className="flex items-center gap-2">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${item.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {item.status}
                </span>
                {isAdmin && (
                  <>
                    <Button variant="outline" className="px-2 py-1" onClick={()=>toggleReceived(item)}>
                      {item.status === 'received' ? 'Undo' : 'Mark received'}
                    </Button>
                    <Button variant="danger" className="px-2 py-1" onClick={()=>removePayment(item)}>
                      <TrashIcon className="mr-1 inline h-4 w-4" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showQR} onClose={()=>setShowQR(false)} title="Scan to pay (UPI)">
        <div className="flex flex-col items-center gap-3">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`}
            alt="UPI QR"
            className="h-60 w-60 rounded-xl border bg-white p-2 shadow"
          />
          <div className="w-full break-all rounded bg-gray-50 p-2 text-xs text-gray-700">{upiUrl}</div>
          <Button onClick={()=>{ navigator.clipboard?.writeText(upiUrl) }}>Copy UPI link</Button>
          <p className="mt-1 text-center text-xs text-gray-500">Open your UPI app and choose “Scan & Pay”, or copy the link if scanning isn't available.</p>
        </div>
      </Modal>
    </div>
  )
}