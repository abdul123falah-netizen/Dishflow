'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/shared/header'
import {
  useSuppliers, useAddSupplier, useUpdateSupplier, useDeleteSupplier,
  PAYMENT_TERMS, type Supplier,
} from '@/lib/hooks/use-suppliers'
import {
  Plus, Pencil, Trash2, Search, Loader2, X,
  Phone, Mail, MapPin, User, FileText, Building2,
} from 'lucide-react'

// ─── Supplier Modal ───────────────────────────────────────────────────────────
const EMPTY: Omit<Supplier, 'id' | 'restaurant_id' | 'is_active' | 'created_at'> = {
  name: '', contact_person: null, email: null, phone: null,
  address: null, payment_terms: 'net30', notes: null,
}

function SupplierModal({ supplier, onClose }: { supplier?: Supplier | null; onClose: () => void }) {
  const addSupplier    = useAddSupplier()
  const updateSupplier = useUpdateSupplier()
  const isEdit = !!supplier

  const [form, setForm] = useState({
    name:           supplier?.name ?? '',
    contact_person: supplier?.contact_person ?? '',
    email:          supplier?.email ?? '',
    phone:          supplier?.phone ?? '',
    address:        supplier?.address ?? '',
    payment_terms:  supplier?.payment_terms ?? 'net30',
    notes:          supplier?.notes ?? '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name:           form.name.trim(),
      contact_person: form.contact_person.trim() || null,
      email:          form.email.trim() || null,
      phone:          form.phone.trim() || null,
      address:        form.address.trim() || null,
      payment_terms:  form.payment_terms,
      notes:          form.notes.trim() || null,
    }
    if (isEdit) await updateSupplier.mutateAsync({ id: supplier!.id, updates: payload })
    else        await addSupplier.mutateAsync(payload)
    onClose()
  }

  const isPending = addSupplier.isPending || updateSupplier.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-bold">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Company Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Fresh Foods Trading"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Contact Person</label>
              <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
                placeholder="Ahmad Al-Rashid"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Payment Terms</label>
              <select value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="supplier@company.com"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Phone / WhatsApp</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+971 50 123 4567"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="e.g. Al Quoz Industrial Area, Dubai"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Delivery schedule, special terms, etc."
              rows={2}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Supplier Card ────────────────────────────────────────────────────────────
function SupplierCard({ supplier, onEdit, onDelete }: {
  supplier: Supplier; onEdit: () => void; onDelete: () => void
}) {
  const termLabel = PAYMENT_TERMS.find(t => t.value === supplier.payment_terms)?.label ?? supplier.payment_terms

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[var(--primary)]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm">{supplier.name}</p>
            <span className="text-[10px] bg-slate-100 text-[var(--muted-foreground)] rounded-full px-2 py-0.5 font-medium">
              {termLabel}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit}
            className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-slate-100 transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete}
            className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
        {supplier.contact_person && (
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 shrink-0" />
            <span>{supplier.contact_person}</span>
          </div>
        )}
        {supplier.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 shrink-0" />
            <a href={`tel:${supplier.phone}`} className="hover:text-[var(--primary)]">{supplier.phone}</a>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 shrink-0" />
            <a href={`mailto:${supplier.email}`} className="hover:text-[var(--primary)] truncate">{supplier.email}</a>
          </div>
        )}
        {supplier.address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{supplier.address}</span>
          </div>
        )}
        {supplier.notes && (
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-[var(--border)]">
            <FileText className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{supplier.notes}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const deleteSupplier = useDeleteSupplier()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = useMemo(() =>
    search ? suppliers.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_person ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(search.toLowerCase())
    ) : suppliers,
  [suppliers, search])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Suppliers"
        action={
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-bold text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Supplier
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats + Search */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-2">
              <p className="text-xs text-[var(--muted-foreground)]">Total Suppliers</p>
              <p className="text-xl font-extrabold">{suppliers.length}</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2">
              <p className="text-xs text-[var(--muted-foreground)]">Active</p>
              <p className="text-xl font-extrabold text-[var(--primary)]">{suppliers.filter(s => s.is_active).length}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="text-sm focus:outline-none w-44 placeholder:text-[var(--muted-foreground)]" />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading suppliers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
            <Building2 className="h-10 w-10 text-slate-200" />
            <p className="text-sm">{suppliers.length === 0 ? 'No suppliers yet — add your first vendor' : 'No suppliers match your search'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(s => (
              <SupplierCard
                key={s.id}
                supplier={s}
                onEdit={() => setEditSupplier(s)}
                onDelete={() => setDeleteConfirm(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <p className="font-bold text-base mb-2">Remove supplier?</p>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">
              They will be hidden from your list. Existing POs and RFQs won't be affected.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={async () => { await deleteSupplier.mutateAsync(deleteConfirm); setDeleteConfirm(null) }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:opacity-90">
                {deleteSupplier.isPending ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd      && <SupplierModal onClose={() => setShowAdd(false)} />}
      {editSupplier && <SupplierModal supplier={editSupplier} onClose={() => setEditSupplier(null)} />}
    </div>
  )
}
