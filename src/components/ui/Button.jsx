export default function Button({ as:As='button', variant='default', className='', children, ...props }){
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2'
  const variants = {
    default: 'bg-gray-900 text-white hover:bg-black focus-visible:ring-gray-500',
    outline: 'border hover:bg-gray-50',
    soft: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
    danger: 'border border-red-300 text-red-700 hover:bg-red-50 focus-visible:ring-red-400'
  }
  const cls = `${base} ${variants[variant]||variants.default} ${className}`
  return <As className={cls} {...props}>{children}</As>
}
