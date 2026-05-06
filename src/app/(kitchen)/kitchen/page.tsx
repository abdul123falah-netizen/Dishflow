'use client'

import { useEffect, useState } from 'react'
import { useKitchenOrders, useUpdateOrderStatus } from '@/lib/hooks/use-orders'
import { useQueryClient } from '@tanstack/react-query'
import { DishflowLogo } from '@/components/shared/dishflow-logo'
import { DeliveryPanel, getPlatform, parsePlatform } from '@/components/kitchen/delivery-panel'
import { Loader2, RefreshCw, ChefHat, Bell, CheckCheck, Bike } from 'lucide-react'
import type { Order, OrderItem } from '@/types'

const COLS = [
  {
    status: 'confirmed' as const,
    label: 'New Orders',
    next: 'preparing' as const,
    nextLabel: 'Start Cooking',
    bg: 'bg-orange-500',
    ring: 'ring-orange-500/40',
    headerBg: 'bg-orange-500/15 border-orange-500/30',
    icon: Bell,
  },
  {
    status: 'preparing' as const,
    label: 'Cooking',
    next: 'ready' as const,
    nextLabel: 'Mark Ready',
    bg: 'bg-yellow-500',
    ring: 'ring-yellow-500/40',
    headerBg: 'bg-yellow-500/15 border-yellow-500/30',
    icon: ChefHat,
  },
  {
    status: 'ready' as const,
    label: 'Ready to Serve',
    next: 'completed' as const,
    nextLabel: 'Served ✓',
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-500/40',
    headerBg: 'bg-emerald-500/15 border-emerald-500/30',
    icon: CheckCheck,
  },
]

type FilterType = 'all' | 'dine_in' | 'takeaway' | 'delivery'

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'dine_in', label: 'Dine-in' },
  { id: 'takeaway', label: 'Takeaway' },
  { id: 'delivery', label: 'Delivery' },
]

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function ElapsedTimer({ createdAt, now }: { createdAt: string; now: number }) {
  const secs = Math.floor((now - new Date(createdAt).getTime()) / 1000)
  const mins = Math.floor(secs / 60)
  const s = secs % 60
  const label = `${mins}:${String(s).padStart(2, '0')}`
  const color =
    mins < 5 ? 'text-emerald-400' :
    mins < 10 ? 'text-yellow-400' :
    'text-red-400 animate-pulse'
  return <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>{label}</span>
}

function OrderTypeBadge({ order }: { order: Order }) {
  if (order.order_type === 'delivery') {
    const parsed = parsePlatform(order.delivery_notes ?? undefined)
    if (parsed) {
      const pl = getPlatform(parsed.platform)
      return (
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${pl.bg} ${pl.text}`}>
            <Bike className="h-3 w-3" /> {parsed.platform}
          </span>
          <span className="text-xs text-slate-500 font-mono">#{parsed.extId}</span>
        </div>
      )
    }
    return (
      <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-xs font-semibold text-pink-300">
        Delivery
      </span>
    )
  }
  if (order.order_type === 'dine_in') {
    return (
      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
        Table {order.table?.table_number ?? '—'}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300">
      Takeaway
    </span>
  )
}

function OrderCard({
  order, col, now, onAdvance, advancing,
}: {
  order: Order
  col: typeof COLS[number]
  now: number
  onAdvance: (id: string, next: typeof col.next) => void
  advancing: boolean
}) {
  const isUrgent = (Date.now() - new Date(order.created_at).getTime()) > 10 * 60 * 1000

  return (
    <div className={`flex flex-col rounded-xl border bg-slate-800 ring-1 transition-shadow
      ${isUrgent ? 'ring-red-500/60 border-red-500/40' : `border-slate-700 ${col.ring}`}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between rounded-t-xl border-b px-3 py-2 ${col.headerBg}`}>
        <div className="flex flex-col gap-1">
          <span className="text-base font-extrabold tracking-tight">#{order.order_number}</span>
          <OrderTypeBadge order={order} />
        </div>
        <ElapsedTimer createdAt={order.created_at} now={now} />
      </div>

      {/* Items */}
      <div className="flex-1 space-y-2 px-3 py-3">
        {(order.items ?? []).map((item: OrderItem) => (
          <div key={item.id} className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${col.bg} text-white`}>
                ×{item.quantity}
              </span>
              <span className="text-sm font-semibold leading-tight">{item.item_name}</span>
            </div>
            {item.variants?.map(v => (
              <p key={v.id} className="ml-8 text-xs text-slate-400">⬡ {v.variant_name}</p>
            ))}
            {item.modifiers?.map(m => (
              <p key={m.id} className="ml-8 text-xs text-slate-400">+ {m.modifier_name}</p>
            ))}
            {item.notes && (
              <p className="ml-8 text-xs italic text-yellow-400">📝 {item.notes}</p>
            )}
          </div>
        ))}

        {order.notes && (
          <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2 py-1.5 text-xs text-yellow-300">
            <span className="font-semibold">Note: </span>{order.notes}
          </div>
        )}

        {order.delivery_address && (
          <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-400">
            <span className="shrink-0">📍</span>
            <span>{order.delivery_address}</span>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="border-t border-slate-700 px-3 py-2.5">
        <button
          onClick={() => onAdvance(order.id, col.next)}
          disabled={advancing}
          className={`w-full rounded-lg py-2 text-sm font-bold text-white transition-opacity
            ${col.bg} hover:opacity-90 active:opacity-75 disabled:opacity-40`}
        >
          {advancing ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : col.nextLabel}
        </button>
      </div>
    </div>
  )
}

export default function KitchenPage() {
  const { data: orders = [], isLoading, dataUpdatedAt } = useKitchenOrders()
  const updateStatus = useUpdateOrderStatus()
  const queryClient = useQueryClient()
  const now = useNow()
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showDelivery, setShowDelivery] = useState(false)

  const [clock, setClock] = useState('')
  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  async function handleAdvance(id: string, next: 'preparing' | 'ready' | 'completed') {
    setAdvancing(id)
    try {
      await updateStatus.mutateAsync({ id, status: next })
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    } finally {
      setAdvancing(null)
    }
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.order_type === filter)
  const deliveryCount = orders.filter(o => o.order_type === 'delivery').length

  const lastSync = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-3">
        <div className="flex items-center gap-3">
          <DishflowLogo size={34} />
          <div>
            <p className="text-sm font-bold leading-none text-white">Kitchen Display</p>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Live order board</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-1">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === f.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f.label}
                {f.id === 'delivery' && deliveryCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {deliveryCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* New delivery order */}
          <button
            onClick={() => setShowDelivery(v => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              showDelivery
                ? 'bg-orange-500 text-white'
                : 'border border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
            }`}
          >
            <Bike className="h-3.5 w-3.5" />
            New Delivery
          </button>

          <p className="text-xs text-slate-500">Synced {lastSync}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <p className="font-mono text-xl font-bold text-white tabular-nums">{clock}</p>
        </div>
      </header>

      {/* Board + optional delivery panel */}
      <div className="flex flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" /> Loading orders...
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {COLS.map((col, ci) => {
              const colOrders = filteredOrders.filter(o => o.status === col.status)
              const Icon = col.icon
              return (
                <div
                  key={col.status}
                  className={`flex flex-1 flex-col overflow-hidden ${
                    ci < COLS.length - 1 || showDelivery ? 'border-r border-slate-800' : ''
                  }`}
                >
                  <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-200">{col.label}</span>
                    <span className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${col.bg}`}>
                      {colOrders.length}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto p-3">
                    {colOrders.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-700">
                        <Icon className="h-8 w-8" />
                        <p className="text-sm">No orders</p>
                      </div>
                    ) : (
                      colOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          col={col}
                          now={now}
                          onAdvance={handleAdvance}
                          advancing={advancing === order.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Delivery order entry panel */}
        {showDelivery && (
          <DeliveryPanel onClose={() => setShowDelivery(false)} />
        )}
      </div>
    </div>
  )
}
