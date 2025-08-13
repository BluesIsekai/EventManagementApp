import { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function Inventory() {
  const [name, setName] = useState('')
  const [qtyNeeded, setQtyNeeded] = useState('')
  const [qtyHave, setQtyHave] = useState('')
  const [items, setItems] = useState([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  async function addItem() {
    if (!name) return
    await addDoc(collection(db, 'inventory'), {
      name,
      qtyNeeded: Number(qtyNeeded || 0),
      qtyHave: Number(qtyHave || 0),
      notes: notes || '',
      createdAt: new Date(),
    })
    setName(''); setQtyNeeded(''); setQtyHave(''); setNotes('')
  }

  async function updateHave(item, delta) {
    const ref = doc(db, 'inventory', item.id)
    await updateDoc(ref, { qtyHave: Math.max(0, (item.qtyHave || 0) + delta) })
  }

  async function removeItem(item) {
    await deleteDoc(doc(db, 'inventory', item.id))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Inventory</h2>

      <div className="grid gap-3 sm:grid-cols-4">
        <input className="rounded border px-3 py-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Item name (e.g., Modak)" />
        <input className="rounded border px-3 py-2" type="number" value={qtyNeeded} onChange={e=>setQtyNeeded(e.target.value)} placeholder="Needed (total)" />
        <div className="flex gap-2">
          <input className="rounded border px-3 py-2 w-full" type="number" value={qtyHave} onChange={e=>setQtyHave(e.target.value)} placeholder="Have" />
          <button onClick={addItem} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Add</button>
        </div>
        <input className="rounded border px-3 py-2" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)" />
      </div>

      <div className="rounded border bg-white">
        <div className="grid grid-cols-5 gap-2 border-b p-3 text-sm font-medium">
          <div>Item</div><div>Needed (total)</div><div>Have</div><div>Status</div><div>Notes</div>
        </div>
        <div className="divide-y">
          {items.map(item => {
            const have = item.qtyHave || 0
            const need = item.qtyNeeded || 0
            const status = have >= need ? 'Ready' : `${need - have} pending`
            return (
              <div key={item.id} className="grid grid-cols-5 gap-2 p-3 text-sm items-center">
                <div className="font-medium">{item.name}</div>
                <div>{need}</div>
                <div className="flex items-center gap-2">
                  <button className="rounded border px-2 py-1" onClick={()=>updateHave(item, -1)}>-</button>
                  <span>{have}</span>
                  <button className="rounded border px-2 py-1" onClick={()=>updateHave(item, +1)}>+</button>
                </div>
                <div>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs ${have >= need ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{item.notes || '-'}</span>
                  <button className="rounded border px-2 py-1 hover:bg-red-50 text-red-700 border-red-300 ml-auto" onClick={()=>removeItem(item)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
