'use client'

import { useTableFloor } from '@/lib/hooks/use-settings'
import { UtensilsCrossed, AlertCircle, CheckCircle2, ChefHat } from 'lucide-react'
import Link from 'next/link'

export function LiveStatusBar() {
  const { data: tables = [] } = useTableFloor()

  const available = tables.filter(t => !t.activeOrder).length
  const occupied  = tables.filter(t => t.activeOrder && t.activeOrder.status !== 'ready').length
  const ready     = tables.filter(t => t.activeOrder?.status === 'ready').length
  const unpaid    = tables.filter(t => t.activeOrder && t.activeOrder.payment_status !== 'paid').length

  const stats = [
    { label: 'Available',      value: available, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200',  Icon: CheckCircle2,   href: '/tables' },
    { label: 'Occupied',       value: occupied,  color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200',    Icon: UtensilsCrossed, href: '/tables' },
    { label: 'Ready to Serve', value: ready,     color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300', Icon: ChefHat,         href: '/kitchen' },
    { label: 'Unpaid Tables',  value: unpaid,    color: 'text-red-600',     bg: 'bg-red-50 border-red-200',          Icon: AlertCircle,     href: '/tables' },
  ]

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Live Floor Status</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(s => (
          <Link
            key={s.label}
            href={s.href}
            className={`flex items-center gap-3 rounded-xl border ${s.bg} px-4 py-3 hover:opacity-80 transition-opacity`}
          >
            <s.Icon className={`h-5 w-5 ${s.color} shrink-0`} />
            <div>
              <p className={`text-xl font-extrabold leading-none ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
