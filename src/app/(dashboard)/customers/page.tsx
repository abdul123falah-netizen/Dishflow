'use client'

import { useState } from 'react'
import { Header } from '@/components/shared/header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Search, X, Phone, Mail, MapPin, Star, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useCustomers, useUpdateCustomer } from '@/lib/hooks/use-customers'
import type { Customer } from '@/types'

const TAG_FILTER = ['all', 'vip', 'regular', 'blacklisted'] as const
const TAG_BADGE: Record<string, 'info' | 'success' | 'destructive' | 'secondary'> = {
  vip: 'info', regular: 'secondary', blacklisted: 'destructive',
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<typeof TAG_FILTER[number]>('all')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [editNotes, setEditNotes] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const { data: customers = [], isLoading } = useCustomers(search, tagFilter)
  const updateCustomer = useUpdateCustomer()

  async function changeTag(id: string, tag: Customer['tag']) {
    await updateCustomer.mutateAsync({ id, updates: { tag } })
    setSelected(prev => prev?.id === id ? { ...prev, tag } : prev)
  }

  async function saveNotes(id: string) {
    await updateCustomer.mutateAsync({ id, updates: { notes: noteDraft } })
    setSelected(prev => prev?.id === id ? { ...prev, notes: noteDraft } : prev)
    setEditNotes(false)
  }

  function getDaysAgo(date?: string) {
    if (!date) return 'Never'
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Customers" subtitle={`${customers.length} customers`} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden border-r border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-white px-4 py-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1">
              {TAG_FILTER.map(t => (
                <button
                  key={t}
                  onClick={() => setTagFilter(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                    tagFilter === t
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-slate-100 text-[var(--muted-foreground)] hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading customers...
              </div>
            ) : customers.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-[var(--muted-foreground)]">
                No customers yet — they appear here after their first order
              </div>
            ) : (
              customers.map((c: Customer) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === c.id ? 'bg-orange-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600 shrink-0">
                        {c.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{c.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={TAG_BADGE[c.tag] ?? 'secondary'} className="text-xs capitalize">{c.tag}</Badge>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">{getDaysAgo(c.last_order_at ?? undefined)}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-[var(--muted-foreground)]">
                    <span>{c.total_orders} orders</span>
                    <span>{formatCurrency(Number(c.total_spent), 'AED')} spent</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="w-80 shrink-0 bg-white flex flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h3 className="font-semibold text-sm">Customer Profile</h3>
                <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white text-lg font-bold">
                    {selected.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{selected.full_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {selected.tag === 'vip' && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                      <select
                        value={selected.tag}
                        onChange={e => changeTag(selected.id, e.target.value as Customer['tag'])}
                        className="text-xs border border-[var(--border)] rounded px-1.5 py-0.5"
                      >
                        <option value="regular">Regular</option>
                        <option value="vip">VIP</option>
                        <option value="blacklisted">Blacklisted</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {selected.phone && <div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Phone className="h-3.5 w-3.5" />{selected.phone}</div>}
                  {selected.email && <div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Mail className="h-3.5 w-3.5" />{selected.email}</div>}
                  {selected.address && <div className="flex items-center gap-2 text-[var(--muted-foreground)]"><MapPin className="h-3.5 w-3.5" />{selected.address}</div>}
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{selected.total_orders}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Orders</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{Math.round(Number(selected.total_spent))}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">AED Spent</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {selected.total_orders > 0 ? Math.round(Number(selected.total_spent) / selected.total_orders) : '—'}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">Avg AED</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Notes</p>
                    <button onClick={() => { setEditNotes(!editNotes); setNoteDraft(selected.notes ?? '') }} className="text-xs text-[var(--primary)] hover:underline">
                      {editNotes ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {editNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        placeholder="Add notes..."
                      />
                      <Button size="sm" onClick={() => saveNotes(selected.id)} className="w-full" disabled={updateCustomer.isPending}>
                        {updateCustomer.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save Notes
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">{selected.notes || 'No notes yet.'}</p>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Last Visit</p>
                  <p className="text-sm">{selected.last_order_at ? formatDate(selected.last_order_at) : 'No visits yet'}</p>
                </div>

                {selected.created_at && (
                  <p className="text-xs text-[var(--muted-foreground)]">Customer since {formatDate(selected.created_at)}</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-[var(--muted-foreground)]">
              Select a customer to view profile
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
