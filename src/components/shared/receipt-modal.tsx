'use client'

import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export type ReceiptData = {
  // Restaurant
  restaurantName: string
  restaurantAddress?: string | null
  restaurantPhone?: string | null
  vatNumber?: string | null
  currency: string
  vatRate: number
  // Order
  orderNumber: string
  orderType: 'dine_in' | 'takeaway' | 'delivery'
  tableLabel?: string
  createdAt: string
  // Items
  items: {
    item_name: string
    quantity: number
    unit_price: number
    line_total: number
    variant?: string
    modifiers?: string[]
  }[]
  // Totals
  subtotal: number
  vatAmount: number
  totalAmount: number
  // Payment
  paymentMethod: string
  amountPaid: number
  change: number
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  wallet: 'Digital Wallet',
}

function ReceiptContent({ data }: { data: ReceiptData }) {
  const date = new Date(data.createdAt)
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      id="receipt-content"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        width: '300px',
        padding: '20px 16px',
        background: 'white',
        color: '#000',
        fontSize: '12px',
        lineHeight: '1.6',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.5px' }}>
          {data.restaurantName}
        </div>
        {data.restaurantAddress && (
          <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>{data.restaurantAddress}</div>
        )}
        {data.restaurantPhone && (
          <div style={{ fontSize: '11px', color: '#555' }}>Tel: {data.restaurantPhone}</div>
        )}
        {data.vatNumber && (
          <div style={{ fontSize: '11px', color: '#555' }}>VAT No: {data.vatNumber}</div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />

      {/* Order Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
        <span>Order #</span>
        <span style={{ fontWeight: '700' }}>{data.orderNumber}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
        <span>Date</span>
        <span>{dateStr}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
        <span>Time</span>
        <span>{timeStr}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
        <span>Type</span>
        <span>{ORDER_TYPE_LABEL[data.orderType] ?? data.orderType}</span>
      </div>
      {data.orderType === 'dine_in' && data.tableLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
          <span>Table</span>
          <span>{data.tableLabel}</span>
        </div>
      )}

      <div style={{ borderTop: '1px dashed #aaa', margin: '10px 0' }} />

      {/* Items */}
      <div style={{ marginBottom: '10px' }}>
        {data.items.map((item, i) => (
          <div key={i} style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '700', flex: 1, paddingRight: '8px' }}>
                {item.quantity}× {item.item_name}
              </span>
              <span style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>
                {formatCurrency(item.line_total, data.currency)}
              </span>
            </div>
            {item.variant && (
              <div style={{ fontSize: '10px', color: '#555', paddingLeft: '16px' }}>
                + {item.variant}
              </div>
            )}
            {item.modifiers && item.modifiers.length > 0 && (
              <div style={{ fontSize: '10px', color: '#555', paddingLeft: '16px' }}>
                {item.modifiers.join(', ')}
              </div>
            )}
            <div style={{ fontSize: '10px', color: '#888', paddingLeft: '16px' }}>
              @ {formatCurrency(item.unit_price, data.currency)} each
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />

      {/* Totals */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
          <span>Subtotal</span>
          <span>{formatCurrency(data.subtotal, data.currency)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
          <span>VAT ({data.vatRate}%)</span>
          <span>{formatCurrency(data.vatAmount, data.currency)}</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '15px', fontWeight: '800',
          marginTop: '6px', paddingTop: '6px',
          borderTop: '1px solid #000',
        }}>
          <span>TOTAL</span>
          <span>{formatCurrency(data.totalAmount, data.currency)}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />

      {/* Payment */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
          <span>Payment</span>
          <span>{PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}</span>
        </div>
        {data.paymentMethod === 'cash' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span>Cash Received</span>
              <span>{formatCurrency(data.amountPaid, data.currency)}</span>
            </div>
            {data.change > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '2px' }}>
                <span>Change</span>
                <span>{formatCurrency(data.change, data.currency)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #aaa', margin: '12px 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#555' }}>
        <div style={{ marginBottom: '4px' }}>Thank you for your visit!</div>
        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '8px' }}>Powered by Dishflow</div>
      </div>
    </div>
  )
}

interface ReceiptModalProps {
  data: ReceiptData
  onClose: () => void
}

export function ReceiptModal({ data, onClose }: ReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = document.getElementById('receipt-content')
    if (!content) return

    const printWindow = window.open('', '_blank', 'width=400,height=700')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt — ${data.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: white; display: flex; justify-content: center; padding: 0; }
            @media print {
              body { padding: 0; }
              @page { margin: 0; size: 80mm auto; }
            }
          </style>
        </head>
        <body>
          ${content.outerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          <\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div>
            <p className="font-bold text-sm">Receipt</p>
            <p className="text-xs text-[var(--muted-foreground)]">{data.orderNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
            >
              <Printer className="h-3.5 w-3.5" /> Print Receipt
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
              <X className="h-4 w-4 text-[var(--muted-foreground)]" />
            </button>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="overflow-y-auto p-6 flex justify-center bg-slate-100">
          <div className="shadow-lg rounded" ref={printRef}>
            <ReceiptContent data={data} />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-slate-50">
            Close
          </button>
          <button onClick={handlePrint}
            className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white hover:opacity-90 flex items-center justify-center gap-2">
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
