'use client'

import { useState } from 'react'
import { Header } from '@/components/shared/header'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  Download, Loader2, TrendingUp, ShoppingBag, Receipt,
  CreditCard, Tag, Plus, Trash2, AlertCircle,
  UtensilsCrossed, Bike, Package,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useReportsData, useAddExpense, useDeleteExpense } from '@/lib/hooks/use-settings'
import { useInventoryItems, stockStatus } from '@/lib/hooks/use-inventory'
import { useRestaurant } from '@/lib/context/restaurant-context'
import Link from 'next/link'

type Period = 'today' | 'week' | 'month' | 'last_month' | 'custom'
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today',      label: 'Today' },
  { value: 'week',       label: 'This Week' },
  { value: 'month',      label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom',     label: 'Custom Range' },
]

const EXPENSE_CATEGORIES = [
  { value: 'rent',        label: 'Rent' },
  { value: 'utilities',   label: 'Utilities' },
  { value: 'salaries',    label: 'Salaries' },
  { value: 'food_cost',   label: 'Food Cost' },
  { value: 'supplies',    label: 'Supplies' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other',       label: 'Other' },
]

const TYPE_COLORS: Record<string, string> = {
  'Dine-in':  '#ea580c',
  'Takeaway': '#0ea5e9',
  'Delivery': '#10b981',
}

const BAR_COLORS = ['#ea580c', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#818cf8']

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, accent = false, warning = false, sub }: {
  label: string; value: string; icon: React.ElementType
  accent?: boolean; warning?: boolean; sub?: string
}) {
  const bg    = accent  ? 'bg-orange-50 border-orange-200'
              : warning ? 'bg-red-50 border-red-200'
              : 'bg-white border-[var(--border)]'
  const color = accent  ? 'text-[var(--primary)]'
              : warning ? 'text-red-600'
              : 'text-[var(--foreground)]'
  const iconBg = accent ? 'bg-orange-100' : warning ? 'bg-red-100' : 'bg-slate-50'

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${bg}`}>
      <div className={`rounded-lg p-2 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--muted-foreground)] truncate">{label}</p>
        <p className={`text-lg font-extrabold leading-tight ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-3">
      {children}
    </h2>
  )
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────
function AddExpenseModal({ onClose, currency }: { onClose: () => void; currency: string }) {
  const addExpense = useAddExpense()
  const [form, setForm] = useState({
    category: 'rent',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.amount) return
    await addExpense.mutateAsync({
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-bold">Add Expense</h3>
          <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Description</label>
            <input
              type="text"
              placeholder="e.g. Monthly rent payment"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addExpense.isPending}
              className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {addExpense.isPending ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const { data, isLoading } = useReportsData(period, customFrom, customTo)
  const { data: inventoryItems = [] } = useInventoryItems()
  const deleteExpense = useDeleteExpense()
  const { restaurant } = useRestaurant()
  const currency = restaurant?.currency ?? 'AED'

  const periodLabel = period === 'today' ? 'Today'
    : period === 'week' ? 'This Week'
    : period === 'month' ? 'This Month'
    : period === 'last_month' ? 'Last Month'
    : customFrom && customTo ? `${customFrom} → ${customTo}`
    : 'Custom Range'

  const lowStockItems  = inventoryItems.filter(i => stockStatus(i) === 'low')
  const outStockItems  = inventoryItems.filter(i => stockStatus(i) === 'out')
  const inventoryValue = inventoryItems.reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_per_unit), 0)

  function exportCSV() {
    if (!data) return
    const rows = [
      ['Report Period', period],
      ['Gross Revenue', data.gross_revenue.toString()],
      ['Net Revenue', data.net_revenue.toString()],
      ['VAT Collected', data.vat_collected.toString()],
      ['Total Discounts', data.total_discounts.toString()],
      ['Total Expenses', data.total_expenses.toString()],
      ['Net Profit', data.net_profit.toString()],
      ['Total Orders', data.total_orders.toString()],
      ['Avg Order Value', data.avg_order_value.toString()],
      [],
      ['Order Type', 'Orders', 'Revenue'],
      ...(data.ordersByType ?? []).map(t => [t.type, t.orders.toString(), t.revenue.toString()]),
      [],
      ['Top Items', 'Qty', 'Revenue'],
      ...data.topItems.map(i => [i.name, i.qty.toString(), i.revenue.toString()]),
      [],
      ['Payment Method', 'Amount', '%'],
      ...data.paymentBreakdown.map(p => [p.method, p.amount.toString(), p.pct.toString()]),
      [],
      ['Expenses'],
      ['Category', 'Description', 'Amount'],
      ...(data.expensesList ?? []).map((e: { category: string; description: string; amount: number }) =>
        [e.category, e.description, e.amount.toString()]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `dishflow-report-${period}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const isProfitable = (data?.net_profit ?? 0) >= 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Reports"
        action={
          <button
            onClick={exportCSV}
            disabled={!data || isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium hover:border-[var(--primary)] disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* Period Filter */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  period === p.value
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[var(--muted-foreground)]">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[var(--muted-foreground)]">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              {customFrom && customTo && (
                <span className="text-xs text-[var(--primary)] font-semibold bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
                  Showing: {customFrom} → {customTo}
                </span>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading report data...
          </div>
        ) : (
          <>
            {/* ── Section 1: Revenue KPIs ── */}
            <section>
              <SectionTitle>Revenue</SectionTitle>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard accent label="Gross Revenue"   value={formatCurrency(data?.gross_revenue ?? 0, currency)}   icon={TrendingUp} />
                <KpiCard accent label="Net Revenue"     value={formatCurrency(data?.net_revenue ?? 0, currency)}     icon={Receipt}    sub="after VAT" />
                <KpiCard       label="Total Orders"     value={(data?.total_orders ?? 0).toLocaleString()}           icon={ShoppingBag} />
                <KpiCard       label="Avg Order Value"  value={formatCurrency(data?.avg_order_value ?? 0, currency)} icon={CreditCard} />
              </div>
            </section>

            {/* ── Section 2: Cost & Profit KPIs ── */}
            <section>
              <SectionTitle>Costs & Profit</SectionTitle>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard label="VAT Collected"   value={formatCurrency(data?.vat_collected ?? 0, currency)}   icon={Receipt} />
                <KpiCard label="Total Discounts" value={formatCurrency(data?.total_discounts ?? 0, currency)} icon={Tag}     warning={(data?.total_discounts ?? 0) > 0} />
                <KpiCard label="Total Expenses"  value={formatCurrency(data?.total_expenses ?? 0, currency)}  icon={Loader2} warning={(data?.total_expenses ?? 0) > 0} />
                <KpiCard
                  label="Net Profit"
                  value={formatCurrency(data?.net_profit ?? 0, currency)}
                  icon={TrendingUp}
                  accent={isProfitable}
                  warning={!isProfitable && (data?.total_expenses ?? 0) > 0}
                  sub={data?.total_expenses ? (isProfitable ? 'Profitable ✓' : 'Loss ⚠') : 'Add expenses to track'}
                />
              </div>
            </section>

            {/* ── Section 3: Revenue Chart + Order Types ── */}
            <section>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Revenue by Day */}
                <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-white p-5">
                  <p className="text-sm font-bold mb-4">Revenue by Day</p>
                  {data && data.dailyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.dailyRevenue} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(v) => [`${currency} ${v}`, 'Revenue']}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]}>
                          {data.dailyRevenue.map((_, i) => (
                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center text-sm text-[var(--muted-foreground)]">
                      No completed orders in this period yet
                    </div>
                  )}
                </div>

                {/* Order Types */}
                <div className="rounded-xl border border-[var(--border)] bg-white p-5">
                  <p className="text-sm font-bold mb-4">Orders by Type</p>
                  <div className="space-y-4 mt-2">
                    {(data?.ordersByType ?? []).map(t => {
                      const total = data?.total_orders ?? 0
                      const pct = total > 0 ? Math.round((t.orders / total) * 100) : 0
                      const icon = t.type === 'Dine-in' ? UtensilsCrossed : t.type === 'Delivery' ? Bike : Package
                      const Icon = icon
                      return (
                        <div key={t.type}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" style={{ color: TYPE_COLORS[t.type] }} />
                              <span className="text-sm font-medium">{t.type}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold">{t.orders}</span>
                              <span className="text-xs text-[var(--muted-foreground)] ml-1">({pct}%)</span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[t.type] }}
                            />
                          </div>
                          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 text-right">
                            {formatCurrency(t.revenue, currency)}
                          </p>
                        </div>
                      )
                    })}
                    {(data?.total_orders ?? 0) === 0 && (
                      <p className="text-sm text-center text-[var(--muted-foreground)] py-8">No orders yet</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Section 4: Hourly Distribution ── */}
            {(data?.hourly ?? []).length > 0 && (
              <section>
                <div className="rounded-xl border border-[var(--border)] bg-white p-5">
                  <p className="text-sm font-bold mb-4">Busiest Hours</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data?.hourly ?? []} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(v, name) => [v, name === 'orders' ? 'Orders' : `Revenue (${currency})`]}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="orders" fill="#fb923c" radius={[4, 4, 0, 0]} name="orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* ── Section 5: Top Items + Payment ── */}
            <section>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Top Items */}
                <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
                  <div className="px-5 py-4 border-b border-[var(--border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">Top Selling Items</p>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{periodLabel}</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  {data && data.topItems.length > 0 ? (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-slate-50">
                            <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--muted-foreground)]">Item</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--muted-foreground)]">Qty</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--muted-foreground)]">Revenue</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--muted-foreground)]">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {data.topItems
                            .filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
                            .map((item, i) => {
                              const pct = data.gross_revenue > 0 ? Math.round((item.revenue / data.gross_revenue) * 100) : 0
                              return (
                                <tr key={item.name} className="hover:bg-slate-50">
                                  <td className="px-4 py-2.5">
                                    <span className="text-[10px] text-[var(--muted-foreground)] font-mono mr-2">{i + 1}</span>
                                    {item.name}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-[var(--muted-foreground)]">{item.qty}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(item.revenue, currency)}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <span className="text-xs bg-orange-50 text-[var(--primary)] font-bold px-1.5 py-0.5 rounded">
                                      {pct}%
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                      {data.topItems.filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                        <p className="p-4 text-center text-xs text-[var(--muted-foreground)]">No items match &quot;{itemSearch}&quot;</p>
                      )}
                    </>
                  ) : (
                    <p className="p-6 text-center text-sm text-[var(--muted-foreground)]">No sales data yet</p>
                  )}
                </div>

                {/* Payment Methods */}
                <div className="rounded-xl border border-[var(--border)] bg-white p-5">
                  <p className="text-sm font-bold mb-4">Payment Methods</p>
                  {data && data.paymentBreakdown.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={data.paymentBreakdown} layout="vertical" barSize={18}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="method" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
                          <Tooltip
                            contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(v) => [`${currency} ${v}`, 'Amount']}
                            cursor={{ fill: '#f8fafc' }}
                          />
                          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                            {data.paymentBreakdown.map((_, i) => (
                              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-3 space-y-1">
                        {data.paymentBreakdown.map((p, i) => (
                          <div key={p.method} className="flex justify-between text-xs text-[var(--muted-foreground)]">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                              {p.method}
                            </span>
                            <span className="font-semibold">{formatCurrency(p.amount, currency)} · {p.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-center text-[var(--muted-foreground)] py-8">No payment data yet</p>
                  )}
                </div>
              </div>
            </section>

            {/* ── Section 6: Inventory Snapshot ── */}
            {inventoryItems.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>Inventory Snapshot</SectionTitle>
                  <Link href="/inventory" className="text-xs font-semibold text-[var(--primary)] hover:underline">View Inventory →</Link>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">Total Items</p>
                    <p className="text-xl font-extrabold">{inventoryItems.length}</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${outStockItems.length > 0 ? 'border-red-200 bg-red-50' : 'border-[var(--border)] bg-white'}`}>
                    <p className="text-xs text-[var(--muted-foreground)]">Out of Stock</p>
                    <p className={`text-xl font-extrabold ${outStockItems.length > 0 ? 'text-red-600' : ''}`}>{outStockItems.length}</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${lowStockItems.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-[var(--border)] bg-white'}`}>
                    <p className="text-xs text-[var(--muted-foreground)]">Low Stock</p>
                    <p className={`text-xl font-extrabold ${lowStockItems.length > 0 ? 'text-amber-600' : ''}`}>{lowStockItems.length}</p>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">Inventory Value</p>
                    <p className="text-xl font-extrabold text-[var(--primary)]">{formatCurrency(inventoryValue, currency)}</p>
                  </div>
                </div>
                {(outStockItems.length > 0 || lowStockItems.length > 0) && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-800">
                      ⚠ {outStockItems.length + lowStockItems.length} items need restocking
                    </p>
                    <Link href="/purchases" className="text-xs font-bold text-[var(--primary)] bg-white border border-[var(--primary)] rounded-lg px-3 py-1.5 hover:bg-orange-50">
                      Create Purchase Order →
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* ── Section 7: Expenses ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>Expenses</SectionTitle>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Expense
                </button>
              </div>

              {(data?.expensesList ?? []).length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[var(--muted-foreground)]">No expenses logged for this period</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Add expenses to calculate your net profit</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Category Breakdown */}
                  {(data?.expensesByCategory ?? []).length > 0 && (
                    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
                      <p className="text-sm font-bold mb-3">By Category</p>
                      <div className="space-y-3">
                        {(data?.expensesByCategory ?? []).map((cat, i) => {
                          const totalExp = data?.total_expenses ?? 0
                          const pct = totalExp > 0 ? Math.round((cat.amount / totalExp) * 100) : 0
                          return (
                            <div key={cat.category}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">{cat.category}</span>
                                <span className="text-[var(--muted-foreground)]">{formatCurrency(cat.amount, currency)} ({pct}%)</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expense List */}
                  <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-white overflow-hidden">
                    <div className="px-5 py-3 border-b border-[var(--border)] bg-slate-50 flex justify-between items-center">
                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Expense Entries</p>
                      <p className="text-sm font-bold text-red-600">{formatCurrency(data?.total_expenses ?? 0, currency)} total</p>
                    </div>
                    <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
                      {(data?.expensesList ?? []).map((exp: { id: string; category: string; description: string; amount: number; date: string }) => (
                        <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 capitalize">
                              {exp.category.replace('_', ' ')}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{exp.description}</p>
                              <p className="text-[10px] text-[var(--muted-foreground)]">{exp.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-red-600">- {formatCurrency(exp.amount, currency)}</span>
                            <button
                              onClick={() => deleteExpense.mutate(exp.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showAddExpense && (
        <AddExpenseModal onClose={() => setShowAddExpense(false)} currency={currency} />
      )}
    </div>
  )
}
