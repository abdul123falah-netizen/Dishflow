'use client'

import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OrderType, RestaurantTable } from '@/types'

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'dine_in', label: 'Dine-In' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' },
]

interface PosHeaderProps {
  orderType: OrderType
  setOrderType: (t: OrderType) => void
  tables: RestaurantTable[]
  tableId: string
  setTableId: (id: string) => void
}

export function PosHeader({ orderType, setOrderType, tables, tableId, setTableId }: PosHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-white border-b border-[var(--border)] px-4 py-2.5 gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-sm font-semibold text-[var(--foreground)]">POS</span>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        {ORDER_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setOrderType(type.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              orderType === type.value
                ? 'bg-white text-[var(--primary)] shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {orderType === 'dine_in' && tables.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--muted-foreground)]">Table:</span>
          <select
            value={tableId}
            onChange={e => setTableId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            {tables.map(t => (
              <option key={t.id} value={t.id}>{t.table_number}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
