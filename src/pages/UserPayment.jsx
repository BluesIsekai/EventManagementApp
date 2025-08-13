import { useState, useMemo, useEffect } from 'react'
import { CreditCardIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
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

// Multiple UPI app intent URLs for better compatibility
function getUpiIntentUrls(args) {
  const upiUrl = upiPayUrl(args)
  const query = upiQuery(args)
  
  return {
    // Generic UPI intent (works with most UPI apps)
    generic: `intent://pay?${query}#Intent;scheme=upi;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;launchFlags=0x10000000;end`,
    
    // Google Pay specific
    gpay: `intent://upi/pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
    
    // PhonePe specific
    phonepe: `intent://upi/pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`,
    
    // Paytm specific
    paytm: `intent://upi/pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`,
    
    // BHIM specific
    bhim: `intent://upi/pay?${query}#Intent;scheme=upi;package=in.org.npci.upiapp;end`,
    
    // Standard UPI URL as fallback
    fallback: upiUrl
  }
}

export default function UserPayment() {
  const [donor, setDonor] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [upiId, setUpiId] = useState('')
  const [note, setNote] = useState('Ganesh Chaturthi 2025 Donation')
  const [showQR, setShowQR] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Load UPI ID from Firestore on component mount
  useEffect(() => {
    const loadUpiId = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'app')
        const settingsSnap = await getDoc(settingsRef)
        
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data()
          if (settings.upiId) {
            setUpiId(settings.upiId)
          }
        }
      } catch (error) {
        console.error('Error loading UPI ID:', error)
        // Fallback to default
        setUpiId('joshitanishq9@okhdfcbank')
      }
    }
    loadUpiId()
  }, [])

  function isValidAmount(v){
    const n = Number(v)
    return Number.isFinite(n) && n > 0
  }

  // Helper to create a 'requested' payment record in Firestore
  async function createPaymentRequest() {
    if (!donor.trim()) {
      alert('Please enter your name')
      return false
    }
    
    if (!isValidAmount(amount)) {
      alert('Please enter a valid amount')
      return false
    }

    setIsSubmitting(true)
    
    try {
      await addDoc(collection(db, 'payments'), {
        donor: donor.trim(),
        email: email.trim() || null,
        amount: Number(amount),
        note,
        mode: 'upi',
        paidAt: null,
        status: 'requested',
        createdAt: serverTimestamp(),
      })
      
      setShowSuccess(true)
      // Clear form after a delay
      setTimeout(() => {
        setDonor('')
        setEmail('')
        setAmount('')
        setShowSuccess(false)
      }, 3000)
      
      return true
    } catch (error) {
      console.error("Failed to create payment request:", error)
      alert('Failed to process request. Please try again.')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const upiUrl = useMemo(() => upiPayUrl({ upiId, amount, note }), [upiId, amount, note])
  const upiIntents = useMemo(() => getUpiIntentUrls({ upiId, amount, note }), [upiId, amount, note])

  async function initiateUpiPayment() {
    const success = await createPaymentRequest()
    if (!success) return
    
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)
    
    if (isAndroid) {
      // For Android, try multiple approaches
      try {
        // First try: Generic UPI intent that should work with any UPI app
        window.location.href = upiIntents.generic
        
        // If that doesn't work after a short delay, try the standard UPI URL
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            console.log('Fallback: Trying standard UPI URL')
            window.location.href = upiUrl
          }
        }, 1000)
        
      } catch (error) {
        console.log('Intent failed, trying standard UPI URL immediately')
        window.location.href = upiUrl
      }
    } else if (isMobile) {
      // For iOS and other mobile OS, use the standard UPI link
      window.location.href = upiUrl
    } else {
      // For desktop, show the QR code modal
      setShowQR(true)
    }
  }

  const suggestedAmounts = [50, 100, 200, 300, 500]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="text-6xl mb-4">🙏</div>
          <h1 className="text-4xl font-bold mb-4">Ganesh Chaturthi 2025</h1>
          <p className="text-xl mb-6 opacity-90">
            Join us in celebrating Lord Ganesha with your divine contribution
          </p>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            Secure UPI Payments Available
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl bg-white shadow-2xl border border-orange-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-100 to-red-100 px-8 py-6 border-b border-orange-200">
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              💫 Make Your Donation
            </h2>
            <p className="text-gray-600 text-center mt-2">
              Your contribution helps us organize a memorable celebration
            </p>
          </div>

          <div className="p-8 space-y-6">
            {showSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-green-800 font-semibold">Payment request submitted!</div>
                <div className="text-green-600 text-sm">Thank you for your contribution to Ganesh Chaturthi 2025</div>
              </div>
            )}

            {/* Donor Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name *
                </label>
                <Input
                  value={donor}
                  onChange={e => setDonor(e.target.value)}
                  placeholder="Enter your full name"
                  className="text-lg h-12 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address (Optional)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="text-lg h-12 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Amount Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Donation Amount (₹) *
              </label>
              
              {/* Suggested Amounts */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {suggestedAmounts.map(amt => (
                  <Button
                    key={amt}
                    variant="outline"
                    onClick={() => setAmount(amt.toString())}
                    className={`h-12 ${amount === amt.toString() ? 'bg-orange-100 border-orange-500 text-orange-700' : ''}`}
                  >
                    ₹{amt}
                  </Button>
                ))}
              </div>

              {/* Custom Amount */}
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="text-lg h-12 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                min="1"
              />
            </div>

            {/* Payment Actions */}
            <div className="space-y-4 pt-4">
              <Button
                onClick={initiateUpiPayment}
                className="w-full h-14 text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg"
                disabled={isSubmitting || !donor.trim() || !isValidAmount(amount)}
              >
                <CreditCardIcon className="h-6 w-6" />
                {isSubmitting ? 'Processing...' : 'Pay via UPI'}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  if (isValidAmount(amount)) {
                    setShowQR(true)
                  } else {
                    alert('Please enter a valid amount first')
                  }
                }}
                className="w-full h-12 border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <QrCodeIcon className="h-5 w-5" />
                Show QR Code
              </Button>
              
              {/* UPI Apps Available Indicator */}
              <div className="text-center text-xs text-gray-500 bg-blue-50 rounded-lg p-3">
                💳 Supports: Google Pay • PhonePe • Paytm • BHIM • Other UPI Apps
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="border-t border-gray-200 pt-6">
              <div className="text-center text-sm text-gray-600 space-y-2">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>UPI Protected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Instant Transfer</span>
                  </div>
                </div>
                <p className="text-xs opacity-75">
                  Your payment is processed securely through UPI. 
                  We don't store any banking information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal open={showQR} onClose={() => setShowQR(false)} title="📱 Scan to Pay">
        <div className="flex flex-col items-center gap-6 p-4">
          <div className="p-6 bg-white rounded-2xl shadow-lg border-2 border-gray-100">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiUrl)}`}
              alt="UPI QR Code"
              className="h-70 w-70 rounded-xl"
            />
          </div>
          
          <div className="text-center space-y-3">
            <div className="text-lg font-semibold text-gray-900">
              ₹{amount} to {donor}
            </div>
            <div className="text-sm text-gray-600">
              Open any UPI app and scan this QR code to pay
            </div>
          </div>

          <Button
            onClick={() => { navigator.clipboard?.writeText(upiUrl) }}
            variant="outline"
            className="w-full"
          >
            📋 Copy UPI Link
          </Button>
        </div>
      </Modal>

      {/* Footer */}
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>🙏 May Lord Ganesha bless you with prosperity and happiness</p>
      </div>
    </div>
  )
}
