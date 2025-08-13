export function Card({ className='', children }){
  return <div className={`rounded-xl border bg-white/80 shadow-sm ${className}`}>{children}</div>
}
export function CardHeader({ className='', children }){
  return <div className={`border-b px-3 py-2 ${className}`}>{children}</div>
}
export function CardBody({ className='', children }){
  return <div className={`divide-y ${className}`}>{children}</div>
}
