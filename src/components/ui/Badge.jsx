export default function Badge({ children, color='gray' }){
  const map = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    emerald: 'bg-emerald-50 text-emerald-700'
  }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${map[color]||map.gray}`}>{children}</span>
}
