'use client'

import { Minus, Plus, Trash2, ShoppingBag, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, getOrderTypeLabel } from '@/lib/utils'
import type { CartItem, OrderType } from '@/types'

interface OrderPanelProps {
  orderType: OrderType
  tableLabel: string
  cartItems: CartItem[]
  subtotal: number
  vatAmount: number
  totalAmount: number
  orderNote: string
  isSaving: boolean
  sentToKitchen: boolean
  onUpdateQuantity: (index: number, delta: number) => void
  onRemoveItem: (index: number) => void
  onClear: () => void
  onNoteChange: (note: string) => void
  onPay: () => void
  onSendToKitchen: () => void
}

export function OrderPanel({
  orderType, tableLabel, cartItems, subtotal, vatAmount, totalAmount,
  orderNote, isSaving, sentToKitchen, onUpdateQuantity, onRemoveItem,
  onClear, onNoteChange, onPay, onSendToKitchen
}: OrderPanelProps) {
  const isEmpty = cartItems.length === 0

  return (
    <div className="flex w-80 flex-col border-l border-[var(--border)] bg-white shrink-0">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{getOrderTypeLabel(orderType)}</p>
          {orderType === 'dine_in' && tableLabel && (
            <p className="text-xs text-[var(--muted-foreground)]">Table {tableLabel}</p>
          )}
        </div>
        {!isEmpty && (
          <button onClick={onClear} className="text-xs text-red-500 hover:text-red-700 font-medium">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--muted-foreground)]">
            <ShoppingBag className="h-10 w-10 opacity-30" />
            <p className="text-sm">No items added yet</p>
            <p className="text-xs">Tap an item from the menu</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {cartItems.map((item, index) => (
              <div key={index} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.item_name}</p>
                    {item.selected_variant && (
                      <p className="text-xs text-[var(--muted-foreground)]">{item.selected_variant.name}</p>
                    )}
                    {item.selected_modifiers.length > 0 && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.selected_modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-amber-600 italic">{item.notes}</p>
                    )}
                  </div>
                  <button onClick={() => onRemoveItem(index)} className="text-[var(--muted-foreground)] hover:text-red-500 shrink-0 mt-0.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(index, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] hover:bg-slate-50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(index, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] hover:bg-slate-50"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(item.line_total, 'AED')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <input
            type="text"
            placeholder="Order note..."
            value={orderNote}
            onChange={e => onNoteChange(e.target.value)}
            className="w-full text-xs text-[var(--muted-foreground)] focus:outline-none bg-transparent"
          />
        </div>
      )}

      {!isEmpty && (
        <div className="border-t border-[var(--border)] px-4 py-4 space-y-2">
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, 'AED')}</span>
          </div>
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>VAT (5%)</span>
            <span>{formatCurrency(vatAmount, 'AED')}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-[var(--primary)]">{formatCurrency(totalAmount, 'AED')}</span>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] p-4 space-y-2">
        <Button onClick={onPay} disabled={isEmpty || isSaving} className="w-full" size="lg">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : '💳 '}
          Pay {!isEmpty && formatCurrency(totalAmount, 'AED')}
        </Button>
        <Button
          variant={sentToKitchen ? 'success' : 'outline'}
          disabled={isEmpty || isSaving || sentToKitchen}
          onClick={onSendToKitchen}
          className="w-full"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : sentToKitchen ? (
            <CheckCircle2 className="h-4 w-4 mr-1" />
          ) : null}
          {sentToKitchen ? 'Sent to Kitchen ✓' : 'Send to Kitchen'}
        </Button>
      </div>
    </div>
  )
}
