'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/shared/header'
import {
  useInventoryItems, useAddInventoryItem, useUpdateInventoryItem,
  useAdjustStock, useDeleteInventoryItem,
  stockStatus, INVENTORY_CATEGORIES, INVENTORY_UNITS,
  type InventoryItem,
} from '@/lib/hooks/use-inventory'
import { useRestaurant } from '@/lib/context/restaurant-context'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, AlertTriangle, XCircle, Package, Pencil, Trash2,
  Minus, Search, Loader2, X, ChevronUp, ChevronDown,
} from 'lucide-react'

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  ok:  { label: 'In Stock', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-400' },
  low: { label: 'Low Stock', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  bar: 'bg-amber-400'  },
  out: { label: 'Out of Stock', bg: 'bg-red-50', text: 'text-red-700',    dot: 'bg-red-500',    bar: 'bg-red-400'    },
}

function StatusBadge({ status }: { status: 'ok' | 'low' | 'out' }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function StockBar({ current, min }: { current: number; min: number }) {
  if (min <= 0) return null
  const pct = Math.min(100, Math.round((current / (min * 2)) * 100))
  const status = current <= 0 ? 'out' : current <= min ? 'low' : 'ok'
  return (
    <div className="w-16 h-1.5 rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full transition-all ${STATUS_CFG[status].bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Item Form Modal ──────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', category: 'other', unit: 'kg', current_stock: '', min_stock: '', cost_per_unit: '', supplier: '' }

function ItemModal({
  item, onClose, currency,
}: { item?: InventoryItem | null; onClose: () => void; currency: string }) {
  const addItem = useAddInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const [form, setForm] = useState(item ? {
    name: item.name, category: item.category, unit: item.unit,
    current_stock: String(item.current_stock), min_stock: String(item.min_stock),
    cost_per_unit: String(item.cost_per_unit), supplier: item.supplier ?? '',
  } : EMPTY_FORM)

  const isEdit = !!item
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      current_stock: Number(form.current_stock) || 0,
      min_stock: Number(form.min_stock) || 0,
      cost_per_unit: Number(form.cost_per_unit) || 0,
      supplier: form.supplier.trim() || null,
    }
    if (isEdit) {
      await updateItem.mutateAsync({ id: item!.id, updates: payload })
    } else {
      await addItem.mutateAsync(payload as Parameters<typeof addItem.mutateAsync>[0])
    }
    onClose()
  }

  const isPending = addItem.isPending || updateItem.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-bold">{isEdit ? 'Edit Item' : 'Add Inventory Item'}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Item Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chicken Breast"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                {INVENTORY_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                {INVENTORY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Current Stock</label>
              <input type="number" min="0" step="0.001" value={form.current_stock} onChange={e => set('current_stock', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Alert Below</label>
              <input type="number" min="0" step="0.001" value={form.min_stock} onChange={e => set('min_stock', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Cost/{form.unit} ({currency})</label>
              <input type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Supplier (optional)</label>
            <input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="e.g. Fresh Foods Co."
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Adjust Stock Modal ───────────────────────────────────────────────────────
function AdjustModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const adjustStock = useAdjustStock()
  const [qty, setQty] = useState('')
  const [mode, setMode] = useState<'add' | 'remove'>('add')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const delta = mode === 'add' ? Number(qty) : -Number(qty)
    await adjustStock.mutateAsync({ id: item.id, delta, current: item.current_stock })
    onClose()
  }

  const newStock = Math.max(0, Number(item.current_stock) + (mode === 'add' ? Number(qty) : -Number(qty)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-bold">Adjust Stock</h3>
            <p className="text-xs text-[var(--muted-foreground)]">{item.name}</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
            {(['add', 'remove'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === m ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)] hover:bg-slate-50'}`}>
                {m === 'add' ? '+ Add Stock' : '- Remove Stock'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Quantity ({item.unit})</label>
            <input required type="number" min="0.001" step="0.001" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          {qty && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Current stock</span><span className="font-semibold">{item.current_stock} {item.unit}</span>
              </div>
              <div className="flex justify-between font-bold mt-1">
                <span>New stock</span>
                <span className={newStock <= item.min_stock ? 'text-amber-600' : 'text-emerald-600'}>
                  {newStock} {item.unit}
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={adjustStock.isPending || !qty}
              className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {adjustStock.isPending ? 'Saving...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { data: items = [], isLoading, isError } = useInventoryItems()
  const deleteItem = useDeleteInventoryItem()
  const { restaurant } = useRestaurant()
  const currency = restaurant?.currency ?? 'AED'

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const lowItems  = useMemo(() => items.filter(i => stockStatus(i) === 'low'), [items])
  const outItems  = useMemo(() => items.filter(i => stockStatus(i) === 'out'), [items])
  const totalValue = useMemo(() => items.reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_per_unit), 0), [items])

  const filtered = useMemo(() => {
    let list = items
    if (filter === 'low') list = list.filter(i => stockStatus(i) === 'low')
    else if (filter === 'out') list = list.filter(i => stockStatus(i) === 'out')
    else if (filter !== 'all') list = list.filter(i => i.category === filter)
    if (search) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.supplier ?? '').toLowerCase().includes(search.toLowerCase()))
    return list
  }, [items, filter, search])

  const alertCount = lowItems.length + outItems.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Inventory"
        action={
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-bold text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Item
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Alert Banner */}
        {alertCount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">
                Stock Alert — {alertCount} item{alertCount > 1 ? 's' : ''} need attention
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {outItems.length > 0 && <span className="font-semibold text-red-600">{outItems.length} out of stock</span>}
                {outItems.length > 0 && lowItems.length > 0 && <span className="mx-1">·</span>}
                {lowItems.length > 0 && <span>{lowItems.length} running low</span>}
                {' · '}
                <button onClick={() => setFilter('out')} className="underline hover:no-underline">View items</button>
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total Items',     value: items.length.toString(),             icon: Package,       color: 'text-[var(--foreground)]',  bg: 'bg-white' },
            { label: 'Low Stock',       value: lowItems.length.toString(),           icon: AlertTriangle, color: 'text-amber-600',            bg: lowItems.length > 0 ? 'bg-amber-50' : 'bg-white' },
            { label: 'Out of Stock',    value: outItems.length.toString(),           icon: XCircle,       color: 'text-red-600',              bg: outItems.length > 0 ? 'bg-red-50' : 'bg-white' },
            { label: 'Inventory Value', value: formatCurrency(totalValue, currency), icon: Package,       color: 'text-[var(--primary)]',     bg: 'bg-orange-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl border border-[var(--border)] ${bg} p-4 flex items-center gap-3`}>
              <Icon className={`h-5 w-5 ${color} shrink-0`} />
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
                <p className={`text-xl font-extrabold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all', label: 'All' },
              { key: 'low', label: `⚠ Low (${lowItems.length})` },
              { key: 'out', label: `✕ Out (${outItems.length})` },
              ...INVENTORY_CATEGORIES.map(c => ({ key: c.value, label: c.label })),
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filter === f.key ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="text-sm focus:outline-none w-40 placeholder:text-[var(--muted-foreground)]" />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading inventory...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-40 text-red-500 text-sm">
            Failed to load inventory. Check Supabase connection.
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
            <Package className="h-10 w-10 text-slate-200" />
            <p className="text-sm">{items.length === 0 ? 'No items yet — add your first inventory item' : 'No items match this filter'}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50">
                  {['Item', 'Category', 'Stock Level', 'Alert Below', 'Cost/Unit', 'Total Value', 'Supplier', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(item => {
                  const st = stockStatus(item)
                  const value = Number(item.current_stock) * Number(item.cost_per_unit)
                  const catLabel = INVENTORY_CATEGORIES.find(c => c.value === item.category)?.label ?? item.category
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold">{item.name}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">{catLabel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StockBar current={Number(item.current_stock)} min={Number(item.min_stock)} />
                          <span className={`font-bold text-xs ${st === 'out' ? 'text-red-600' : st === 'low' ? 'text-amber-600' : 'text-[var(--foreground)]'}`}>
                            {item.current_stock} {item.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">{item.min_stock} {item.unit}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatCurrency(Number(item.cost_per_unit), currency)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(value, currency)}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">{item.supplier ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={st} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAdjustItem(item)} title="Adjust stock"
                            className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-orange-50 hover:text-[var(--primary)] transition-colors">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditItem(item)} title="Edit"
                            className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-slate-100 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(item.id)} title="Delete"
                            className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <p className="font-bold text-base mb-2">Delete item?</p>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">This will remove it from your inventory. This action can't be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={async () => { await deleteItem.mutateAsync(deleteConfirm); setDeleteConfirm(null) }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:opacity-90">
                {deleteItem.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd   && <ItemModal currency={currency} onClose={() => setShowAdd(false)} />}
      {editItem  && <ItemModal currency={currency} item={editItem} onClose={() => setEditItem(null)} />}
      {adjustItem && <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} />}
    </div>
  )
}
