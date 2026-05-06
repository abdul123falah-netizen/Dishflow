'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/shared/header'
import {
  usePurchaseOrders, useCreatePurchaseOrder, useUpdatePOStatus, useReceivePurchaseOrder,
  useInventoryItems, INVENTORY_UNITS,
  type PurchaseOrder, type PurchaseOrderItem,
} from '@/lib/hooks/use-inventory'
import {
  useSuppliers, useRfqs, useCreateRfq, useUpdateRfqStatus,
  useSaveQuote, useDeclineQuote, usePoTemplates, useCreatePoTemplate, useDeletePoTemplate,
  type Rfq, type PoTemplate,
} from '@/lib/hooks/use-suppliers'
import { useRestaurant } from '@/lib/context/restaurant-context'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, ChevronDown, ChevronRight, Loader2, X, Truck,
  CheckCircle, Clock, Ban, FileText, PackageCheck,
  Send, ClipboardList, Copy, Trash2, Star, ChevronUp, BookOpen,
} from 'lucide-react'

// ─── PO Status config ─────────────────────────────────────────────────────────
const PO_STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: 'Draft',     bg: 'bg-slate-100', text: 'text-slate-600',   dot: 'bg-slate-400'   },
  sent:      { label: 'Sent',      bg: 'bg-blue-50',   text: 'text-blue-700',    dot: 'bg-blue-500'    },
  received:  { label: 'Received',  bg: 'bg-emerald-50',text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50',    text: 'text-red-700',     dot: 'bg-red-400'     },
}
const RFQ_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  draft:  { label: 'Draft',  bg: 'bg-slate-100', text: 'text-slate-600'  },
  sent:   { label: 'Sent',   bg: 'bg-blue-50',   text: 'text-blue-700'   },
  quoted: { label: 'Quoted', bg: 'bg-purple-50',  text: 'text-purple-700' },
  closed: { label: 'Closed', bg: 'bg-emerald-50', text: 'text-emerald-700'},
}

function StatusBadge({ label, bg, text, dot }: { label: string; bg: string; text: string; dot?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${bg} ${text}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — PURCHASE ORDERS
// ══════════════════════════════════════════════════════════════

function CreatePOModal({ onClose, currency, supplierId }: {
  onClose: () => void; currency: string; supplierId?: string
}) {
  const { data: inventoryItems = [] } = useInventoryItems()
  const { data: suppliers = [] } = useSuppliers()
  const createPO = useCreatePurchaseOrder()

  const [supplier, setSupplier] = useState(supplierId ?? '')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Omit<PurchaseOrderItem, 'id' | 'purchase_order_id'>[]>([
    { inventory_item_id: null, item_name: '', quantity: 0, unit: 'kg', unit_cost: 0, total_cost: 0 },
  ])

  function updateRow(i: number, key: string, value: string | number | null) {
    setRows(prev => {
      const next = [...prev]
      const row = { ...next[i], [key]: value }
      if (key === 'inventory_item_id' && value) {
        const inv = inventoryItems.find(it => it.id === value)
        if (inv) { row.item_name = inv.name; row.unit = inv.unit; row.unit_cost = inv.cost_per_unit }
      }
      row.total_cost = Number(row.quantity) * Number(row.unit_cost)
      next[i] = row
      return next
    })
  }

  const total = rows.reduce((s, r) => s + Number(r.total_cost), 0)
  const selectedSupplier = suppliers.find(s => s.id === supplier)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valid = rows.filter(r => r.item_name.trim() && r.quantity > 0)
    if (!valid.length) return
    await createPO.mutateAsync({
      supplier_name: selectedSupplier?.name ?? (supplier || undefined),
      expected_date: expectedDate || undefined,
      notes: notes || undefined,
      items: valid,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-base font-bold">Create Purchase Order</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Supplier</label>
                <select value={supplier} onChange={e => setSupplier(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">Select supplier…</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Expected Delivery</label>
                <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional"
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
            </div>
            {/* Line items table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Items</p>
                <button type="button" onClick={() => setRows(r => [...r, { inventory_item_id: null, item_name: '', quantity: 0, unit: 'kg', unit_cost: 0, total_cost: 0 }])}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:opacity-80">
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </button>
              </div>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[var(--border)]">
                      {['Inventory Item', 'Name *', 'Qty *', 'Unit', 'Cost/Unit', 'Total', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[var(--muted-foreground)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <select value={row.inventory_item_id ?? ''} onChange={e => updateRow(i, 'inventory_item_id', e.target.value || null)}
                            className="w-32 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]">
                            <option value="">Custom</option>
                            {inventoryItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input value={row.item_name} onChange={e => updateRow(i, 'item_name', e.target.value)} required placeholder="Item name"
                            className="w-28 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0.001" step="0.001" value={row.quantity || ''} onChange={e => updateRow(i, 'quantity', Number(e.target.value))} required
                            className="w-20 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={row.unit} onChange={e => updateRow(i, 'unit', e.target.value)}
                            className="w-16 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]">
                            {INVENTORY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={row.unit_cost || ''} onChange={e => updateRow(i, 'unit_cost', Number(e.target.value))}
                            className="w-20 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold">{formatCurrency(Number(row.total_cost), currency)}</td>
                        <td className="px-3 py-2">
                          {rows.length > 1 && (
                            <button type="button" onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
                              className="text-slate-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--border)] bg-slate-50">
                      <td colSpan={5} className="px-3 py-2 text-xs font-bold text-right text-[var(--muted-foreground)]">Order Total</td>
                      <td className="px-3 py-2 text-right font-extrabold text-[var(--primary)]">{formatCurrency(total, currency)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-[var(--border)]">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={createPO.isPending}
              className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {createPO.isPending ? 'Creating...' : 'Create Draft PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReceiveModal({ po, onClose, currency }: { po: PurchaseOrder; onClose: () => void; currency: string }) {
  const receivePO = useReceivePurchaseOrder()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-bold">Receive {po.order_number}</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Stock levels will be updated automatically</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
        </div>
        <div className="p-6 space-y-3">
          {po.items.map((item, i) => (
            <div key={i} className={`flex justify-between text-sm px-3 py-2 rounded-lg ${item.inventory_item_id ? 'bg-emerald-50' : 'bg-slate-50'}`}>
              <span className="font-medium">{item.item_name}</span>
              <span className={item.inventory_item_id ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                {item.inventory_item_id ? `+${item.quantity} ${item.unit}` : `${item.quantity} ${item.unit} (custom)`}
              </span>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold">Cancel</button>
            <button onClick={async () => { await receivePO.mutateAsync(po); onClose() }} disabled={receivePO.isPending}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
              <PackageCheck className="h-4 w-4" />
              {receivePO.isPending ? 'Processing...' : 'Confirm Received'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PORow({ po, currency }: { po: PurchaseOrder; currency: string }) {
  const [expanded, setExpanded] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const updateStatus = useUpdatePOStatus()
  const cfg = PO_STATUS[po.status] ?? PO_STATUS.draft

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50' : ''}`}>
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1.5 font-mono text-sm font-bold text-[var(--primary)]">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {po.order_number}
          </button>
        </td>
        <td className="px-4 py-3 text-sm">{po.supplier_name ?? <span className="text-[var(--muted-foreground)]">—</span>}</td>
        <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{po.items.length}</td>
        <td className="px-4 py-3 font-bold text-sm">{formatCurrency(Number(po.total_amount), currency)}</td>
        <td className="px-4 py-3"><StatusBadge {...cfg} /></td>
        <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
          {new Date(po.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {po.status === 'draft' && (
              <button onClick={() => updateStatus.mutate({ id: po.id, status: 'sent' })}
                className="rounded-lg px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100">
                <Send className="h-3 w-3 inline mr-1" />Send
              </button>
            )}
            {(po.status === 'draft' || po.status === 'sent') && (
              <button onClick={() => setShowReceive(true)}
                className="rounded-lg px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
                <Truck className="h-3 w-3" />Receive
              </button>
            )}
            {po.status === 'draft' && (
              <button onClick={() => updateStatus.mutate({ id: po.id, status: 'cancelled' })}
                className="rounded-lg p-1.5 text-slate-300 hover:text-red-500">
                <Ban className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 pb-4">
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[var(--border)]">
                    {['Item', 'Qty', 'Unit Cost', 'Total', 'Inventory'].map(h => (
                      <th key={h} className={`px-3 py-2 font-semibold text-[var(--muted-foreground)] ${h === 'Total' || h === 'Unit Cost' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {po.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{item.item_name}</td>
                      <td className="px-3 py-2">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(Number(item.unit_cost), currency)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(Number(item.total_cost), currency)}</td>
                      <td className="px-3 py-2">{item.inventory_item_id ? <span className="text-emerald-600 font-semibold">✓ Linked</span> : <span className="text-slate-400">Custom</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
      {showReceive && <ReceiveModal po={po} currency={currency} onClose={() => setShowReceive(false)} />}
    </>
  )
}

function PurchaseOrdersTab({ currency }: { currency: string }) {
  const { data: orders = [], isLoading } = usePurchaseOrders()
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrder['status']>('all')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() =>
    statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter),
  [orders, statusFilter])

  const thisMonthSpend = useMemo(() => {
    const now = new Date()
    return orders.filter(o => o.status === 'received' && new Date(o.created_at).getMonth() === now.getMonth())
      .reduce((s, o) => s + Number(o.total_amount), 0)
  }, [orders])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total POs',    value: orders.length,                                     color: '' },
            { label: 'Pending',      value: orders.filter(o => o.status === 'draft' || o.status === 'sent').length, color: 'text-blue-600' },
            { label: 'Month Spend',  value: formatCurrency(thisMonthSpend, currency),           color: 'text-[var(--primary)]' },
            { label: 'Received',     value: orders.filter(o => o.status === 'received').length, color: 'text-emerald-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-center">
              <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
              <p className={`text-lg font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-bold text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> Create PO
        </button>
      </div>

      <div className="flex gap-1.5">
        {(['all', 'draft', 'sent', 'received', 'cancelled'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${statusFilter === s ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'}`}>
            {s === 'all' ? `All (${orders.length})` : `${PO_STATUS[s].label} (${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center h-32 items-center gap-2 text-[var(--muted-foreground)]"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-[var(--muted-foreground)]">
          <Truck className="h-8 w-8 text-slate-200" /><p className="text-sm">No purchase orders yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50">
                {['PO Number', 'Supplier', 'Items', 'Total', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(po => <PORow key={po.id} po={po} currency={currency} />)}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && <CreatePOModal currency={currency} onClose={() => setShowCreate(false)} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — RFQs
// ══════════════════════════════════════════════════════════════

function CreateRFQModal({ onClose }: { onClose: () => void }) {
  const { data: inventoryItems = [] } = useInventoryItems()
  const { data: suppliers = [] } = useSuppliers()
  const createRfq = useCreateRfq()

  const [notes, setNotes] = useState('')
  const [requiredBy, setRequiredBy] = useState('')
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [items, setItems] = useState([{ inventory_item_id: null as string | null, item_name: '', quantity: '', unit: 'kg' }])

  function toggleSupplier(id: string) {
    setSelectedSuppliers(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function updateItem(i: number, key: string, value: string | null) {
    setItems(prev => {
      const next = [...prev]
      const row = { ...next[i], [key]: value }
      if (key === 'inventory_item_id' && value) {
        const inv = inventoryItems.find(it => it.id === value)
        if (inv) { row.item_name = inv.name; row.unit = inv.unit }
      }
      next[i] = row
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valid = items.filter(i => i.item_name.trim() && Number(i.quantity) > 0)
    await createRfq.mutateAsync({
      notes: notes || undefined,
      required_by: requiredBy || undefined,
      supplier_ids: selectedSuppliers,
      items: valid.map(i => ({
        inventory_item_id: i.inventory_item_id,
        item_name: i.item_name,
        quantity: Number(i.quantity),
        unit: i.unit,
      })),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-base font-bold">Create Request for Quotation</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Required By</label>
                <input type="date" value={requiredBy} onChange={e => setRequiredBy(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special requirements, delivery instructions…"
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Items Needed</p>
                <button type="button" onClick={() => setItems(i => [...i, { inventory_item_id: null, item_name: '', quantity: '', unit: 'kg' }])}
                  className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </button>
              </div>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[var(--border)]">
                      {['Inventory Item', 'Name *', 'Quantity *', 'Unit', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[var(--muted-foreground)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <select value={row.inventory_item_id ?? ''} onChange={e => updateItem(i, 'inventory_item_id', e.target.value || null)}
                            className="w-32 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none">
                            <option value="">Custom</option>
                            {inventoryItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input value={row.item_name} onChange={e => updateItem(i, 'item_name', e.target.value)} placeholder="Item name" required
                            className="w-32 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0.001" step="0.001" value={row.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} required
                            className="w-20 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={row.unit} onChange={e => updateItem(i, 'unit', e.target.value)}
                            className="w-16 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none">
                            {INVENTORY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {items.length > 1 && (
                            <button type="button" onClick={() => setItems(r => r.filter((_, idx) => idx !== i))}
                              className="text-slate-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suppliers */}
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Send To Suppliers</p>
              {suppliers.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] italic">No suppliers yet — add suppliers first.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {suppliers.map(s => (
                    <label key={s.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedSuppliers.includes(s.id) ? 'border-[var(--primary)] bg-orange-50' : 'border-[var(--border)] hover:border-[var(--primary)]'
                    }`}>
                      <input type="checkbox" checked={selectedSuppliers.includes(s.id)} onChange={() => toggleSupplier(s.id)} className="accent-[var(--primary)]" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{s.name}</p>
                        {s.contact_person && <p className="text-[10px] text-[var(--muted-foreground)]">{s.contact_person}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-[var(--border)]">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={createRfq.isPending}
              className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {createRfq.isPending ? 'Creating…' : 'Create RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuoteEntryModal({ rfq, responseId, onClose, currency }: {
  rfq: Rfq; responseId: string; onClose: () => void; currency: string
}) {
  const saveQuote = useSaveQuote()
  const response = rfq.responses.find(r => r.id === responseId)!
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(rfq.items.map(i => [i.id!, '']))
  )
  const [notes, setNotes] = useState(response.notes ?? '')

  const total = rfq.items.reduce((s, item) => s + Number(prices[item.id!] || 0) * item.quantity, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await saveQuote.mutateAsync({
      response_id: responseId,
      notes: notes || undefined,
      items: rfq.items.map(item => ({
        rfq_item_id: item.id!,
        unit_price: Number(prices[item.id!] || 0),
        total_price: Number(prices[item.id!] || 0) * item.quantity,
      })),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-bold">Enter Quote</h3>
            <p className="text-xs text-[var(--muted-foreground)]">{response.supplier?.name} · {rfq.rfq_number}</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            {rfq.items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.item_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{item.quantity} {item.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="0.01" value={prices[item.id!]} onChange={e => setPrices(p => ({ ...p, [item.id!]: e.target.value }))}
                    placeholder="0.00"
                    className="w-24 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                  <span className="text-xs text-[var(--muted-foreground)] w-12">/{item.unit}</span>
                  <span className="text-sm font-semibold w-24 text-right">
                    = {formatCurrency(Number(prices[item.id!] || 0) * item.quantity, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold border-t border-[var(--border)] pt-3">
            <span>Total Quote</span>
            <span className="text-[var(--primary)]">{formatCurrency(total, currency)}</span>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Notes from supplier</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Delivery time, availability notes…"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={saveQuote.isPending}
              className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90">
              {saveQuote.isPending ? 'Saving…' : 'Save Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RFQRow({ rfq, currency, onConvertToPO }: { rfq: Rfq; currency: string; onConvertToPO: (rfq: Rfq, supplierId: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [quoteFor, setQuoteFor] = useState<string | null>(null)
  const updateRfqStatus = useUpdateRfqStatus()
  const declineQuote = useDeclineQuote()
  const cfg = RFQ_STATUS[rfq.status] ?? RFQ_STATUS.draft

  const quotedResponses = rfq.responses.filter(r => r.status === 'quoted')
  const bestResponse = quotedResponses.length > 0
    ? quotedResponses.reduce((best, r) => {
        const total = r.items.reduce((s, i) => s + Number(i.total_price), 0)
        const bestTotal = best.items.reduce((s, i) => s + Number(i.total_price), 0)
        return total < bestTotal ? r : best
      }, quotedResponses[0])
    : null

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50' : ''}`}>
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1.5 font-mono text-sm font-bold text-purple-600">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {rfq.rfq_number}
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{rfq.items.length} items</td>
        <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{rfq.responses.length} suppliers</td>
        <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{quotedResponses.length} quoted</td>
        <td className="px-4 py-3"><StatusBadge {...cfg} /></td>
        <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
          {new Date(rfq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </td>
        <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
          {rfq.required_by ? new Date(rfq.required_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
        </td>
        <td className="px-4 py-3">
          {rfq.status === 'draft' && (
            <button onClick={() => updateRfqStatus.mutate({ id: rfq.id, status: 'sent' })}
              className="rounded-lg px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100">
              <Send className="h-3 w-3 inline mr-1" />Send
            </button>
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 pb-4 space-y-3">
            {/* Items needed */}
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-[var(--border)]">
                <p className="text-xs font-bold text-[var(--muted-foreground)]">ITEMS REQUESTED</p>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[var(--border)]">
                  {rfq.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-medium">{item.item_name}</td>
                      <td className="px-4 py-2 text-[var(--muted-foreground)]">{item.quantity} {item.unit}</td>
                      {/* Quote prices per supplier */}
                      {rfq.responses.map(resp => {
                        const ri = resp.items.find(ri => ri.rfq_item_id === item.id)
                        const isBest = bestResponse?.id === resp.id
                        return (
                          <td key={resp.id} className={`px-4 py-2 text-right font-semibold ${isBest && ri ? 'text-emerald-600' : ''}`}>
                            {ri ? formatCurrency(Number(ri.unit_price), currency) : <span className="text-slate-300">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-4 py-2" colSpan={2}>Total</td>
                    {rfq.responses.map(resp => {
                      const total = resp.items.reduce((s, i) => s + Number(i.total_price), 0)
                      const isBest = bestResponse?.id === resp.id && total > 0
                      return (
                        <td key={resp.id} className={`px-4 py-2 text-right ${isBest ? 'text-emerald-600' : ''}`}>
                          {total > 0 ? `${isBest ? '★ ' : ''}${formatCurrency(total, currency)}` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Supplier responses */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rfq.responses.map(resp => {
                const total = resp.items.reduce((s, i) => s + Number(i.total_price), 0)
                const isBest = bestResponse?.id === resp.id && total > 0
                return (
                  <div key={resp.id} className={`rounded-xl border p-4 ${isBest ? 'border-emerald-300 bg-emerald-50' : 'border-[var(--border)] bg-white'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold flex items-center gap-1">
                        {isBest && <Star className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />}
                        {resp.supplier?.name ?? 'Supplier'}
                      </p>
                      <StatusBadge {...{ pending: { label: 'Pending', bg: 'bg-slate-100', text: 'text-slate-600' }, quoted: { label: 'Quoted', bg: 'bg-purple-50', text: 'text-purple-700' }, declined: { label: 'Declined', bg: 'bg-red-50', text: 'text-red-700' } }[resp.status]} />
                    </div>
                    {total > 0 && <p className={`text-lg font-extrabold mb-3 ${isBest ? 'text-emerald-700' : 'text-[var(--foreground)]'}`}>{formatCurrency(total, currency)}</p>}
                    {resp.notes && <p className="text-xs text-[var(--muted-foreground)] mb-3 italic">{resp.notes}</p>}
                    <div className="flex gap-2">
                      {resp.status !== 'declined' && (
                        <button onClick={() => setQuoteFor(resp.id)}
                          className="flex-1 rounded-lg border border-[var(--border)] py-1.5 text-xs font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                          {resp.status === 'quoted' ? 'Edit Quote' : 'Enter Quote'}
                        </button>
                      )}
                      {resp.status === 'quoted' && rfq.status !== 'closed' && (
                        <button onClick={() => onConvertToPO(rfq, resp.supplier_id)}
                          className="flex-1 rounded-lg bg-[var(--primary)] py-1.5 text-xs font-bold text-white hover:opacity-90">
                          → PO
                        </button>
                      )}
                      {resp.status === 'pending' && (
                        <button onClick={() => declineQuote.mutate(resp.id)}
                          className="rounded-lg border border-red-200 py-1.5 px-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                          Decline
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      )}
      {quoteFor && <QuoteEntryModal rfq={rfq} responseId={quoteFor} currency={currency} onClose={() => setQuoteFor(null)} />}
    </>
  )
}

function RFQsTab({ currency, onConvertToPO }: { currency: string; onConvertToPO: (rfq: Rfq, supplierId: string) => void }) {
  const { data: rfqs = [], isLoading } = useRfqs()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | Rfq['status']>('all')

  const filtered = useMemo(() => statusFilter === 'all' ? rfqs : rfqs.filter(r => r.status === statusFilter), [rfqs, statusFilter])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['all', 'draft', 'sent', 'quoted', 'closed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${statusFilter === s ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'}`}>
              {s === 'all' ? `All (${rfqs.length})` : `${RFQ_STATUS[s].label} (${rfqs.filter(r => r.status === s).length})`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-bold text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> New RFQ
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-32 items-center gap-2 text-[var(--muted-foreground)]"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-[var(--muted-foreground)]">
          <ClipboardList className="h-8 w-8 text-slate-200" /><p className="text-sm">No RFQs yet — create one to compare supplier quotes</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50">
                {['RFQ Number', 'Items', 'Suppliers', 'Quoted', 'Status', 'Created', 'Required By', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(rfq => <RFQRow key={rfq.id} rfq={rfq} currency={currency} onConvertToPO={onConvertToPO} />)}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && <CreateRFQModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — TEMPLATES
// ══════════════════════════════════════════════════════════════

function CreateTemplateModal({ onClose, currency }: { onClose: () => void; currency: string }) {
  const { data: inventoryItems = [] } = useInventoryItems()
  const { data: suppliers = [] } = useSuppliers()
  const createTemplate = useCreatePoTemplate()

  const [name, setName] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState([{ inventory_item_id: null as string | null, item_name: '', quantity: '', unit: 'kg', unit_cost: '' }])

  function updateRow(i: number, key: string, value: string | null) {
    setRows(prev => {
      const next = [...prev]
      const row = { ...next[i], [key]: value }
      if (key === 'inventory_item_id' && value) {
        const inv = inventoryItems.find(it => it.id === value)
        if (inv) { row.item_name = inv.name; row.unit = inv.unit; row.unit_cost = String(inv.cost_per_unit) }
      }
      next[i] = row
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valid = rows.filter(r => r.item_name.trim() && Number(r.quantity) > 0)
    await createTemplate.mutateAsync({
      name, supplier_id: supplierId || undefined, notes: notes || undefined,
      items: valid.map(r => ({
        inventory_item_id: r.inventory_item_id,
        item_name: r.item_name,
        quantity: Number(r.quantity),
        unit: r.unit,
        unit_cost: Number(r.unit_cost) || 0,
      })),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-base font-bold">Create PO Template</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Template Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly Produce Order"
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Default Supplier</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">None</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Recurring order notes…"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Default Items</p>
                <button type="button" onClick={() => setRows(r => [...r, { inventory_item_id: null, item_name: '', quantity: '', unit: 'kg', unit_cost: '' }])}
                  className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add Row</button>
              </div>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[var(--border)]">
                      {['Inventory', 'Name *', 'Default Qty *', 'Unit', 'Default Cost', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-[var(--muted-foreground)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <select value={row.inventory_item_id ?? ''} onChange={e => updateRow(i, 'inventory_item_id', e.target.value || null)}
                            className="w-28 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none">
                            <option value="">Custom</option>
                            {inventoryItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input value={row.item_name} onChange={e => updateRow(i, 'item_name', e.target.value)} required placeholder="Name"
                            className="w-28 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0.001" step="0.001" value={row.quantity} onChange={e => updateRow(i, 'quantity', e.target.value)} required
                            className="w-20 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={row.unit} onChange={e => updateRow(i, 'unit', e.target.value)}
                            className="w-14 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none">
                            {INVENTORY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={row.unit_cost} onChange={e => updateRow(i, 'unit_cost', e.target.value)}
                            className="w-20 rounded-lg border border-[var(--border)] px-2 py-1 text-xs focus:outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          {rows.length > 1 && (
                            <button type="button" onClick={() => setRows(r => r.filter((_, idx) => idx !== i))}
                              className="text-slate-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-[var(--border)]">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={createTemplate.isPending}
              className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {createTemplate.isPending ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TemplatesTab({ currency, onUseTpl }: { currency: string; onUseTpl: (tpl: PoTemplate) => void }) {
  const { data: templates = [], isLoading } = usePoTemplates()
  const deleteTemplate = useDeletePoTemplate()
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">Save recurring orders as templates to fire off a PO in one click.</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-bold text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-32 items-center gap-2 text-[var(--muted-foreground)]"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-[var(--muted-foreground)]">
          <Copy className="h-8 w-8 text-slate-200" /><p className="text-sm">No templates yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(tpl => {
            const totalCost = tpl.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)
            const isOpen = expanded === tpl.id
            return (
              <div key={tpl.id} className="rounded-xl border border-[var(--border)] bg-white overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm">{tpl.name}</p>
                      {tpl.supplier && <p className="text-xs text-[var(--muted-foreground)]">{tpl.supplier.name}</p>}
                    </div>
                    <button onClick={() => deleteTemplate.mutate(tpl.id)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mb-4">
                    <span>{tpl.items.length} items</span>
                    <span>·</span>
                    <span className="font-semibold text-[var(--foreground)]">{formatCurrency(totalCost, currency)} est.</span>
                  </div>
                  {tpl.notes && <p className="text-xs text-[var(--muted-foreground)] mb-3 italic">{tpl.notes}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setExpanded(isOpen ? null : tpl.id)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors">
                      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isOpen ? 'Hide' : 'Items'}
                    </button>
                    <button onClick={() => onUseTpl(tpl)}
                      className="flex-1 rounded-lg bg-[var(--primary)] py-1.5 text-xs font-bold text-white hover:opacity-90 flex items-center justify-center gap-1">
                      <Truck className="h-3 w-3" /> Use Template
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                    {tpl.items.map((item, i) => (
                      <div key={i} className="flex justify-between px-4 py-2 text-xs">
                        <span className="font-medium">{item.item_name}</span>
                        <span className="text-[var(--muted-foreground)]">{item.quantity} {item.unit} × {formatCurrency(item.unit_cost, currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {showCreate && <CreateTemplateModal currency={currency} onClose={() => setShowCreate(false)} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
type TabKey = 'po' | 'rfq' | 'templates'
const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'po',        label: 'Purchase Orders', icon: Truck         },
  { key: 'rfq',       label: 'RFQs',            icon: ClipboardList },
  { key: 'templates', label: 'Templates',        icon: Copy          },
]

export default function PurchasesPage() {
  const [tab, setTab] = useState<TabKey>('po')
  const [createPOFrom, setCreatePOFrom] = useState<{ supplierId?: string } | null>(null)
  const { restaurant } = useRestaurant()
  const currency = restaurant?.currency ?? 'AED'

  function handleConvertToPO(rfq: Rfq, supplierId: string) {
    setTab('po')
    setCreatePOFrom({ supplierId })
  }

  function handleUseTpl(tpl: PoTemplate) {
    setTab('po')
    setCreatePOFrom({ supplierId: tpl.supplier_id ?? undefined })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Purchases"
        action={
          <a
            href="/procurement-guide.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            <BookOpen className="h-4 w-4" /> User Guide
          </a>
        }
      />

      {/* Tab Bar */}
      <div className="flex border-b border-[var(--border)] bg-white px-6 shrink-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'po'        && <PurchaseOrdersTab currency={currency} />}
        {tab === 'rfq'       && <RFQsTab currency={currency} onConvertToPO={handleConvertToPO} />}
        {tab === 'templates' && <TemplatesTab currency={currency} onUseTpl={handleUseTpl} />}
      </div>

      {createPOFrom !== null && (
        <CreatePOModal
          currency={currency}
          supplierId={createPOFrom.supplierId}
          onClose={() => setCreatePOFrom(null)}
        />
      )}
    </div>
  )
}
