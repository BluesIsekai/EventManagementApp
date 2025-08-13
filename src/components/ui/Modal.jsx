export default function Modal({ open, onClose, title, children }){
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-semibold">{title}</h4>
          <button className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}
