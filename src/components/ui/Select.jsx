export default function Select({ className='', ...props }){
  const cls = `mt-1 w-full rounded-lg border px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${className}`
  return <select className={cls} {...props} />
}
