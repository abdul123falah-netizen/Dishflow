'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Loader2, Bike } from 'lucide-react'
import { useCreateOrder } from '@/lib/hooks/use-orders'
import { useQueryClient } from '@tanstack/react-query'

export const PLATFORMS = [
  { id: 'talabat',   name: 'Talabat',         bg: 'bg-orange-500',    border: 'border-orange-500',    text: 'text-white',       dot: 'bg-orange-500' },
  { id: 'careem',    name: 'Careem',           bg: 'bg-green-600',     border: 'border-green-600',     text: 'text-white',       dot: 'bg-green-600' },
  { id: 'noon',      name: 'Noon Food',        bg: 'bg-yellow-400',    border: 'border-yellow-400',    text: 'text-slate-900',   dot: 'bg-yellow-400' },
  { id: 'deliveroo', name: 'Deliveroo',        bg: 'bg-teal-500',      border: 'border-teal-500',      text: 'text-white',       dot: 'bg-teal-500' },
  { id: 'hunger',    name: 'HungerStation',    bg: 'bg-red-600',       border: 'border-red-600',       text: 'text-white',       dot: 'bg-red-600' },
  { id: 'jahez',     name: 'Jahez',            bg: 'bg-purple-600',    border: 'border-purple-600',    text: 'text-white',       dot: 'bg-purple-600' },
  { id: 'other',     name: 'Other',            bg: 'bg-slate-600',     border: 'border-slate-600',     text: 'text-white',       dot: 'bg-slate-500' },
] as const

export type PlatformId = typeof PLATFORMS[number]['id']

export function getPlatform(idOrName: string) {
  return (
    PLATFORMS.find(p => p.id === idOrName) ??
    PLATFORMS.find(p => p.name.toLowerCase() === idOrName.toLowerCase()) ??
    PLATFORMS[PLATFORMS.length - 1]
  )
}

export function parsePlatform(deliveryNotes?: string): { platform: string; extId: string } | null {
  if (!deliveryNotes) return null
  const m = deliveryNotes.match(/^PLATFORM:([^|]+)\|EXT_ID:(.+)$/)
  if (!m) return null
  return { platform: m[1], extId: m[2] }
}

interface DeliveryItem {
  name: string
  qty: number
  notes: string
}

interface DeliveryPanelProps {
  onClose: () => void
}

export function DeliveryPanel({ onClose }: DeliveryPanelProps) {
  const queryClient = useQueryClient()
  const createOrder = useCreateOrder()

  const [platform, setPlatform] = useState<PlatformId>('talabat')
  const [extId, setExtId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [items, setItems] = useState<DeliveryItem[]>([
    { name: '', qty: 1, notes: '' },
  ])

  function addItem() {
    setItems(prev => [...prev, { name: '', qty: 1, notes: '' }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof DeliveryItem, value: string | number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const validItems = items.filter(i => i.name.trim())
  const canSubmit = extId.trim() && validItems.length > 0

  async function handleSubmit() {
    if (!canSubmit) return
    const p = getPlatform(platform)

    await createOrder.mutateAsync({
      order_type: 'delivery',
      delivery_address: address.trim() || undefined,
      notes: [
        `PLATFORM:${p.name}|EXT_ID:${extId.trim()}`,
        customerName.trim() ? `Customer: ${customerName.trim()}` : '',
        orderNote.trim(),
      ].filter(Boolean).join(' · ') || undefined,
      subtotal: 0,
      vat_rate: 0,
      vat_amount: 0,
      total_amount: 0,
      items: validItems.map(item => ({
        item_name: item.name.trim(),
        unit_price: 0,
        quantity: item.qty,
        notes: item.notes.trim() || undefined,
        line_total: 0,
      })),
    })

    queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    onClose()
  }

  const pl = getPlatform(platform)

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-slate-700 bg-slate-900">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bike className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-bold text-white">New Delivery Order</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 p-4">
        {/* Platform picker */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform</p>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all ${
                  platform === p.id
                    ? `${p.bg} ${p.border} ${p.text} shadow-lg`
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Order ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {pl.name} Order # <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 1234567"
            value={extId}
            onChange={e => setExtId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Customer name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Customer Name</label>
          <input
            type="text"
            placeholder="Optional"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Delivery address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Delivery Address</label>
          <input
            type="text"
            placeholder="Optional"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Items <span className="text-red-400">*</span>
          </p>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 p-2 space-y-2">
                <div className="flex items-center gap-2">
                  {/* Qty */}
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={e => updateItem(i, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none"
                  />
                  {/* Name */}
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={e => updateItem(i, 'name', e.target.value)}
                    className="flex-1 rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {/* Per-item note */}
                <input
                  type="text"
                  placeholder="Item note (e.g. no onions)"
                  value={item.notes}
                  onChange={e => updateItem(i, 'notes', e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add item
          </button>
        </div>

        {/* Order note */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order Note</label>
          <input
            type="text"
            placeholder="e.g. Ring doorbell, 3rd floor"
            value={orderNote}
            onChange={e => setOrderNote(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="border-t border-slate-700 p-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || createOrder.isPending}
          className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity
            ${pl.bg} disabled:opacity-40 hover:opacity-90 active:opacity-75`}
        >
          {createOrder.isPending
            ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            : `Send to Kitchen`}
        </button>
      </div>
    </div>
  )
}
