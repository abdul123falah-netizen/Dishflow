'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

type PaymentMethod = 'cash' | 'card' | 'wallet'

interface SplitEntry {
  method: PaymentMethod
  amount: string
}

interface PaymentModalProps {
  totalAmount: number
  currency: string
  isLoading: boolean
  onClose: () => void
  onComplete: (method: string, amount: number, reference?: string) => Promise<void>
  onCompleteSplit?: (splits: Array<{ method: string; amount: number }>) => Promise<void>
}

const METHOD_ICONS: Record<PaymentMethod, string> = { cash: '💵', card: '💳', wallet: '📱' }
const METHODS: PaymentMethod[] = ['cash', 'card', 'wallet']

export function PaymentModal({ totalAmount, currency, isLoading, onClose, onComplete, onCompleteSplit }: PaymentModalProps) {
  const [tab, setTab] = useState<'single' | 'split'>('single')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [reference, setReference] = useState('')
  const [completed, setCompleted] = useState(false)
  const [change, setChange] = useState(0)

  // Split state
  const [splits, setSplits] = useState<SplitEntry[]>([
    { method: 'cash', amount: '' },
    { method: 'card', amount: '' },
  ])

  const cashAmount = parseFloat(cashReceived) || 0
  const singleChange = Math.max(0, cashAmount - totalAmount)
  const canCompleteSingle = method !== 'cash' || cashAmount >= totalAmount

  const splitTotal = splits.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const splitRemaining = Math.round((totalAmount - splitTotal) * 100) / 100
  const canCompleteSplit = Math.abs(splitRemaining) < 0.01 && splits.every(e => parseFloat(e.amount) > 0)

  function appendDigit(digit: string) {
    setCashReceived(prev => {
      if (digit === '.' && prev.includes('.')) return prev
      if (digit === '⌫') return prev.slice(0, -1)
      return prev + digit
    })
  }

  async function handleComplete() {
    const amount = method === 'cash' ? cashAmount : totalAmount
    await onComplete(method, amount, reference || undefined)
    setChange(method === 'cash' ? singleChange : 0)
    setCompleted(true)
  }

  async function handleCompleteSplit() {
    const entries = splits.map(s => ({ method: s.method, amount: parseFloat(s.amount) }))
    if (onCompleteSplit) {
      await onCompleteSplit(entries)
    } else {
      // fallback: record first split as primary
      await onComplete(entries[0].method, entries[0].amount)
    }
    setChange(0)
    setCompleted(true)
  }

  function updateSplit(index: number, field: 'method' | 'amount', value: string) {
    setSplits(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function addSplit() {
    setSplits(prev => [...prev, { method: 'cash', amount: '' }])
  }

  function removeSplit(index: number) {
    setSplits(prev => prev.filter((_, i) => i !== index))
  }

  function distributeEvenly() {
    const perPerson = Math.round((totalAmount / splits.length) * 100) / 100
    setSplits(prev => prev.map((s, i) =>
      i === prev.length - 1
        ? { ...s, amount: (totalAmount - perPerson * (prev.length - 1)).toFixed(2) }
        : { ...s, amount: perPerson.toFixed(2) }
    ))
  }

  useEffect(() => {
    if (completed) {
      const t = setTimeout(() => onClose(), 2500)
      return () => clearTimeout(t)
    }
  }, [completed])

  if (completed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-10 shadow-xl">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <p className="text-2xl font-bold text-green-600">Payment Complete!</p>
          {change > 0 && (
            <p className="text-lg text-[var(--muted-foreground)]">
              Change: <span className="font-bold text-[var(--foreground)]">{formatCurrency(change, currency)}</span>
            </p>
          )}
          <p className="text-xs text-[var(--muted-foreground)]">Tap to dismiss</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold">Payment</h2>
          <button onClick={onClose} disabled={isLoading}><X className="h-5 w-5 text-[var(--muted-foreground)]" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Total Due</p>
            <p className="text-3xl font-bold">{formatCurrency(totalAmount, currency)}</p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setTab('single')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'single' ? 'bg-white shadow-sm' : 'text-[var(--muted-foreground)]'}`}
            >
              Single
            </button>
            <button
              onClick={() => setTab('split')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'split' ? 'bg-white shadow-sm' : 'text-[var(--muted-foreground)]'}`}
            >
              Split
            </button>
          </div>

          {tab === 'single' ? (
            <>
              <div className="flex gap-2">
                {METHODS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                      method === m
                        ? 'border-[var(--primary)] bg-orange-50 text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {METHOD_ICONS[m]} {m}
                  </button>
                ))}
              </div>

              {method === 'cash' ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[var(--border)] bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs text-[var(--muted-foreground)]">Cash received</p>
                    <p className="text-2xl font-mono font-bold">{cashReceived || '0'} {currency}</p>
                  </div>
                  <div className="flex gap-2">
                    {[Math.ceil(totalAmount / 50) * 50, Math.ceil(totalAmount / 50) * 50 + 50, Math.ceil(totalAmount / 50) * 50 + 100]
                      .filter(a => a >= totalAmount).slice(0, 3)
                      .map(amount => (
                        <button key={amount} onClick={() => setCashReceived(amount.toString())}
                          className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium hover:bg-slate-200">
                          {amount}
                        </button>
                      ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(key => (
                      <button key={key} onClick={() => appendDigit(key)}
                        className="flex items-center justify-center rounded-lg bg-slate-100 py-3 text-base font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors">
                        {key}
                      </button>
                    ))}
                  </div>
                  {cashAmount >= totalAmount && cashAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">Change</span>
                      <span className="font-bold text-green-600">{formatCurrency(singleChange, currency)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder={method === 'card' ? 'Card terminal reference (optional)' : 'Transaction reference (optional)'}
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted-foreground)]">Split between methods</p>
                <button onClick={distributeEvenly} className="text-xs text-[var(--primary)] hover:underline">
                  Split evenly
                </button>
              </div>

              {splits.map((split, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={split.method}
                    onChange={e => updateSplit(i, 'method', e.target.value)}
                    className="rounded-lg border border-[var(--border)] px-2 py-2 text-sm flex-shrink-0"
                  >
                    {METHODS.map(m => <option key={m} value={m}>{METHOD_ICONS[m]} {m}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={split.amount}
                    onChange={e => updateSplit(i, 'amount', e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">{currency}</span>
                  {splits.length > 2 && (
                    <button onClick={() => removeSplit(i)} className="text-[var(--muted-foreground)] hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              <button onClick={addSplit} className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline">
                <Plus className="h-3 w-3" /> Add payment method
              </button>

              <div className={`flex justify-between text-sm font-medium rounded-lg px-3 py-2 ${
                Math.abs(splitRemaining) < 0.01 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}>
                <span>{Math.abs(splitRemaining) < 0.01 ? 'Fully allocated' : 'Remaining'}</span>
                <span>{Math.abs(splitRemaining) < 0.01 ? '✓' : formatCurrency(splitRemaining, currency)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4">
          {tab === 'single' ? (
            <Button onClick={handleComplete} disabled={!canCompleteSingle || isLoading} className="w-full" size="lg">
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processing...</> : 'Confirm Payment'}
            </Button>
          ) : (
            <Button onClick={handleCompleteSplit} disabled={!canCompleteSplit || isLoading} className="w-full" size="lg">
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processing...</> : 'Confirm Split Payment'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
