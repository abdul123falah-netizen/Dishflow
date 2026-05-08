'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/shared/header'
import { useTableFloor } from '@/lib/hooks/use-settings'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Clock, Pencil, Check, X, MonitorSmartphone,
  Receipt, Loader2, UtensilsCrossed, ChevronRight, CreditCard
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRestaurant } from '@/lib/context/restaurant-context'

// ─── Types ────────────────────────────────────────────────────────────────────
type TableShape = 'round' | 'rect' | 'rect-large'
type TableStatus = 'available' | 'occupied' | 'preparing' | 'ready'

interface FloorTable {
  id: string
  table_number: string
  capacity: number
  pos_x: number | null
  pos_y: number | null
  shape: TableShape | null
  activeOrder: {
    id: string
    order_number: string
    status: string
    payment_status: string
    total_amount: number
    created_at: string
    items: { id: string; item_name: string; quantity: number }[]
  } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatus(order: FloorTable['activeOrder']): TableStatus {
  if (!order) return 'available'
  if (order.status === 'ready') return 'ready'
  if (order.status === 'preparing') return 'preparing'
  return 'occupied'
}

const STATUS = {
  available: { ring: 'ring-2 ring-emerald-400', fill: 'bg-emerald-50', label: 'Available', labelColor: 'text-emerald-600', dot: 'bg-emerald-500' },
  occupied:  { ring: 'ring-2 ring-orange-400',  fill: 'bg-orange-50',  label: 'Occupied',  labelColor: 'text-orange-600',  dot: 'bg-orange-500'  },
  preparing: { ring: 'ring-2 ring-yellow-400',  fill: 'bg-yellow-50',  label: 'Cooking',   labelColor: 'text-yellow-600',  dot: 'bg-yellow-500'  },
  ready:     { ring: 'ring-2 ring-emerald-500', fill: 'bg-emerald-100',label: 'Ready',     labelColor: 'text-emerald-700', dot: 'bg-emerald-500 animate-pulse' },
}

const SHAPE_SIZES: Record<TableShape, { w: number; h: number }> = {
  round:        { w: 80,  h: 80 },
  rect:         { w: 110, h: 75 },
  'rect-large': { w: 140, h: 80 },
}

// Chair positions (px, relative to table container top-left)
// horizontal: true = wide chair (along long edge), false = tall chair (along short edge)
const CHAIR_LAYOUTS: Record<TableShape, { x: number; y: number; horizontal?: boolean }[]> = {
  round: [
    { x: 33, y: -22 },
    { x: 33, y: 88  },
    { x: -22, y: 33 },
    { x: 88,  y: 33 },
  ],
  rect: [
    { x: 10, y: -19, horizontal: true },
    { x: 45, y: -19, horizontal: true },
    { x: 80, y: -19, horizontal: true },
    { x: 10, y: 83,  horizontal: true },
    { x: 45, y: 83,  horizontal: true },
    { x: 80, y: 83,  horizontal: true },
    { x: -19, y: 27 },
    { x: 118, y: 27 },
  ],
  'rect-large': [
    { x: 10,  y: -19, horizontal: true },
    { x: 43,  y: -19, horizontal: true },
    { x: 76,  y: -19, horizontal: true },
    { x: 110, y: -19, horizontal: true },
    { x: 10,  y: 88,  horizontal: true },
    { x: 43,  y: 88,  horizontal: true },
    { x: 76,  y: 88,  horizontal: true },
    { x: 110, y: 88,  horizontal: true },
    { x: -19, y: 30 },
    { x: 148, y: 30 },
  ],
}

function defaultShape(capacity: number): TableShape {
  if (capacity <= 4) return 'round'
  if (capacity <= 6) return 'rect'
  return 'rect-large'
}

function ElapsedTime({ createdAt }: { createdAt: string }) {
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function calc() {
      const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
      const m = Math.floor(secs / 60)
      const h = Math.floor(m / 60)
      setLabel(h > 0 ? `${h}h ${m % 60}m` : `${m}m`)
      setUrgent(m > 60)
    }
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [createdAt])

  return (
    <span className={`flex items-center gap-1 text-xs font-mono ${urgent ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
      <Clock className="h-3 w-3" />{label}
    </span>
  )
}

// ─── Update hook ──────────────────────────────────────────────────────────────
function useUpdateTableLayout() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, pos_x, pos_y, shape }: { id: string; pos_x?: number; pos_y?: number; shape?: TableShape }) => {
      const updates: Record<string, unknown> = {}
      if (pos_x !== undefined) updates.pos_x = pos_x
      if (pos_y !== undefined) updates.pos_y = pos_y
      if (shape !== undefined) updates.shape = shape
      const { error } = await supabase.from('restaurant_tables').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['table-floor'] }),
  })
}

// ─── Table Shape ─────────────────────────────────────────────────────────────
function TableNode({
  table, editMode, selected, onSelect, onDragStart,
}: {
  table: FloorTable
  editMode: boolean
  selected: boolean
  onSelect: () => void
  onDragStart: (e: React.MouseEvent, id: string) => void
}) {
  const status = getStatus(table.activeOrder)
  const cfg = STATUS[status]
  const shape = (table.shape ?? defaultShape(table.capacity)) as TableShape
  const { w, h } = SHAPE_SIZES[shape]
  const isRound = shape === 'round'

  const x = table.pos_x ?? 10
  const y = table.pos_y ?? 10

  const chairs = CHAIR_LAYOUTS[shape]

  return (
    <div
      className={`absolute select-none ${editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${selected ? 'z-20' : 'z-10'}`}
      style={{ left: `${x}%`, top: `${y}%`, width: w, height: h, transform: 'translate(-50%, -50%)' }}
      onMouseDown={e => { if (editMode) onDragStart(e, table.id); else onSelect() }}
      onClick={e => { if (!editMode) { e.stopPropagation(); onSelect() } }}
    >
      {/* Chairs */}
      {chairs.map((chair, i) => (
        <div
          key={i}
          className="absolute bg-slate-300 border border-slate-400 shadow-sm"
          style={{
            left: chair.x,
            top: chair.y,
            width:  isRound ? 14 : chair.horizontal ? 20 : 11,
            height: isRound ? 14 : chair.horizontal ? 11 : 20,
            borderRadius: isRound ? '50%' : 4,
          }}
        />
      ))}

      {/* Table surface */}
      <div
        className={`w-full h-full flex flex-col items-center justify-center
          ${cfg.fill} ${cfg.ring}
          ${isRound ? 'rounded-full' : 'rounded-xl'}
          ${selected ? 'shadow-xl ring-[var(--primary)] ring-2' : 'shadow-md hover:shadow-lg'}
          transition-all`}
      >
        {/* Status dot */}
        <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${cfg.dot}`} />

        {/* Table number */}
        <p className="text-sm font-extrabold text-[var(--foreground)] leading-none">
          {table.table_number}
        </p>

        {/* Capacity */}
        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
          <Users className="h-2.5 w-2.5" />{table.capacity}
        </p>

        {/* Order number if occupied */}
        {table.activeOrder && (
          <p className={`text-[9px] font-bold mt-1 ${cfg.labelColor}`}>
            #{table.activeOrder.order_number}
          </p>
        )}

        {/* Payment badge */}
        {table.activeOrder && (
          <span className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap
            ${table.activeOrder.payment_status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {table.activeOrder.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function TableDetail({ table, onClose, currency }: { table: FloorTable; onClose: () => void; currency: string }) {
  const router = useRouter()
  const status = getStatus(table.activeOrder)
  const cfg = STATUS[status]
  const order = table.activeOrder

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-[var(--border)] bg-white">
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b border-[var(--border)] ${cfg.fill}`}>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-extrabold">Table {table.table_number}</p>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-white/70 ${cfg.labelColor}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1">
            <Users className="h-3 w-3" /> {table.capacity} seats
          </p>
        </div>
        <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {order ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Order summary */}
          <div className="px-5 py-4 space-y-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Order #{order.order_number}</p>
              <ElapsedTime createdAt={order.created_at} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted-foreground)]">Payment</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold
                ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {order.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted-foreground)]">Kitchen status</span>
              <span className={`text-xs font-semibold ${cfg.labelColor}`}>{cfg.label}</span>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 px-5 py-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Items ordered</p>
            {(order.items ?? []).map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--foreground)]">{item.item_name}</span>
                <span className="text-sm font-semibold text-[var(--muted-foreground)]">×{item.quantity}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t border-[var(--border)] px-5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-extrabold text-[var(--primary)]">
                {formatCurrency(Number(order.total_amount), currency)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 space-y-2">
            {order.payment_status !== 'paid' && (
              <button
                onClick={() => router.push(`/pos?order=${order.id}`)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                <CreditCard className="h-4 w-4" /> Process Payment
              </button>
            )}
            <button
              onClick={() => router.push('/orders')}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              <Receipt className="h-4 w-4" /> View Full Order
            </button>
            <button
              onClick={() => router.push('/pos')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            >
              <MonitorSmartphone className="h-4 w-4" /> Open in POS
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <UtensilsCrossed className="h-7 w-7 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">Table is free</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">No active orders</p>
          </div>
          <button
            onClick={() => router.push('/pos')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            <MonitorSmartphone className="h-4 w-4" /> Open Table in POS
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TablesPage() {
  const { data: rawTables = [], isLoading, isError, error } = useTableFloor()
  const { restaurant } = useRestaurant()
  const updateLayout = useUpdateTableLayout()
  const qc = useQueryClient()

  const tables = rawTables as FloorTable[]

  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<FloorTable | null>(null)
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync local positions from DB
  useEffect(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    tables.forEach((t, i) => {
      pos[t.id] = {
        x: t.pos_x ?? 10 + (i % 5) * 18,
        y: t.pos_y ?? 10 + Math.floor(i / 5) * 22,
      }
    })
    setLocalPos(pos)
  }, [tables.length])

  const handleDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if (!containerRef.current) return
    e.preventDefault()
    const containerRect = containerRef.current.getBoundingClientRect()
    const pos = localPos[id] ?? { x: 10, y: 10 }
    const pxX = (pos.x / 100) * containerRect.width
    const pxY = (pos.y / 100) * containerRect.height
    setDragOffset({ x: e.clientX - containerRect.left - pxX, y: e.clientY - containerRect.top - pxY })
    setDraggingId(id)
  }, [localPos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100))
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100))
    setLocalPos(prev => ({ ...prev, [draggingId]: { x, y } }))
  }, [draggingId, dragOffset])

  const handleMouseUp = useCallback(() => {
    if (!draggingId) return
    const pos = localPos[draggingId]
    if (pos) updateLayout.mutate({ id: draggingId, pos_x: pos.x, pos_y: pos.y })
    setDraggingId(null)
  }, [draggingId, localPos])

  function cycleShape(table: FloorTable) {
    const shapes: TableShape[] = ['round', 'rect', 'rect-large']
    const current = (table.shape ?? defaultShape(table.capacity)) as TableShape
    const next = shapes[(shapes.indexOf(current) + 1) % shapes.length]
    updateLayout.mutate({ id: table.id, shape: next })
  }

  const counts = {
    total: tables.length,
    available: tables.filter(t => !t.activeOrder).length,
    occupied: tables.filter(t => t.activeOrder && t.activeOrder.status !== 'ready').length,
    ready: tables.filter(t => t.activeOrder?.status === 'ready').length,
    unpaid: tables.filter(t => t.activeOrder && t.activeOrder.payment_status !== 'paid').length,
  }

  // Overlay tables with local positions
  const displayTables = tables.map(t => ({
    ...t,
    pos_x: localPos[t.id]?.x ?? t.pos_x ?? 10,
    pos_y: localPos[t.id]?.y ?? t.pos_y ?? 10,
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Floor Plan"
        action={
          <div className="flex items-center gap-2">
            {editMode && (
              <p className="text-xs text-[var(--muted-foreground)]">Drag tables to reposition · Click to change shape</p>
            )}
            <button
              onClick={() => { setEditMode(v => !v); setSelected(null) }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                editMode
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--primary)]'
              }`}
            >
              {editMode ? <><Check className="h-4 w-4" /> Done</> : <><Pencil className="h-4 w-4" /> Edit Layout</>}
            </button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main floor plan */}
        <div className="flex flex-1 flex-col overflow-hidden p-4 gap-4">

          {/* Summary bar */}
          <div className="flex items-center gap-3 shrink-0">
            {[
              { label: 'Total Tables', value: counts.total, color: 'text-[var(--foreground)]', bg: 'bg-white' },
              { label: 'Available', value: counts.available, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Occupied', value: counts.occupied, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Ready', value: counts.ready, color: 'text-emerald-700', bg: 'bg-emerald-100' },
              { label: 'Unpaid', value: counts.unpaid, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`flex flex-col items-center rounded-xl border border-[var(--border)] ${s.bg} px-4 py-2 min-w-[80px]`}>
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">{s.label}</p>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-3">
              {/* Legend */}
              {Object.entries(STATUS).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <span className={`h-2.5 w-2.5 rounded-full ${val.dot.replace('animate-pulse', '')}`} />
                  {val.label}
                </div>
              ))}
            </div>
          </div>

          {/* Floor canvas */}
          {isError ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-red-500 text-sm">
              Error loading tables: {String(error)}
            </div>
          ) : isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-[var(--muted-foreground)]">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading floor plan...
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative flex-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={() => { if (!editMode) setSelected(null) }}
            >
              {/* Room labels */}
              <div className="absolute top-3 left-4 text-xs font-semibold text-slate-300 uppercase tracking-widest">
                Dining Area
              </div>

              {tables.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--muted-foreground)]">
                  <UtensilsCrossed className="h-10 w-10" />
                  <p className="text-sm">No tables yet. Add tables in Settings → Tables.</p>
                </div>
              ) : (
                displayTables.map(table => (
                  <TableNode
                    key={table.id}
                    table={table}
                    editMode={editMode}
                    selected={selected?.id === table.id}
                    onSelect={() => { setSelected(table); setEditMode(false) }}
                    onDragStart={handleDragStart}
                  />
                ))
              )}

              {/* Edit mode: shape cycle hint */}
              {editMode && selected && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs text-white">
                  Click a table to cycle shape
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && !editMode && (
          <TableDetail
            table={displayTables.find(t => t.id === selected.id) ?? selected}
            onClose={() => setSelected(null)}
            currency={restaurant?.currency ?? 'AED'}
          />
        )}
      </div>
    </div>
  )
}
