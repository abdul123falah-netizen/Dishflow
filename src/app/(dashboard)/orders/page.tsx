'use client'

import { useState } from 'react'
import { Header } from '@/components/shared/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Search, X, Loader2, Printer } from 'lucide-react'
import { cn, formatCurrency, formatDateTime, getOrderTypeLabel } from '@/lib/utils'
import { useOrders, useUpdateOrderStatus, useCancelOrder } from '@/lib/hooks/use-orders'
import { ReceiptModal, type ReceiptData } from '@/components/shared/receipt-modal'
import { useRestaurant } from '@/lib/context/restaurant-context'
import type { Order, OrderStatus } from '@/types'

const STATUS_TABS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as const
type StatusTab = typeof STATUS_TABS[number]

const BADGE_VARIANT: Record<string, 'warning' | 'orange' | 'success' | 'secondary' | 'destructive' | 'info'> = {
  pending: 'warning', confirmed: 'info', preparing: 'orange',
  ready: 'success', completed: 'secondary', cancelled: 'destructive',
}

const STATUS_FLOW: Record<string, string> = {
  pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed',
}

export default function OrdersPage() {
  const { restaurant } = useRestaurant()
  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelInput, setShowCancelInput] = useState(false)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)

  function buildReceiptData(order: Order): ReceiptData {
    return {
      restaurantName: restaurant?.name ?? 'Restaurant',
      restaurantAddress: restaurant?.address ?? null,
      restaurantPhone: restaurant?.phone ?? null,
      vatNumber: (restaurant as any)?.vat_number ?? null,
      currency: restaurant?.currency ?? 'AED',
      vatRate: Number(order.vat_rate ?? 5),
      orderNumber: order.order_number,
      orderType: order.order_type as 'dine_in' | 'takeaway' | 'delivery',
      tableLabel: order.table ? (order.table as any).table_number : undefined,
      createdAt: order.created_at,
      items: (order.items ?? []).map((item: any) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        line_total: Number(item.line_total),
        variant: item.variants?.[0]?.variant_name,
        modifiers: item.modifiers?.map((m: any) => m.modifier_name) ?? [],
      })),
      subtotal: Number(order.subtotal),
      vatAmount: Number(order.vat_amount),
      totalAmount: Number(order.total_amount),
      paymentMethod: (order as any).payment_method ?? 'card',
      amountPaid: Number(order.total_amount),
      change: 0,
    }
  }

  const { data: orders = [], isLoading } = useOrders({
    status: activeTab === 'all' ? undefined : activeTab as OrderStatus,
  })

  const updateStatus = useUpdateOrderStatus()
  const cancelOrder = useCancelOrder()

  const filtered = orders.filter(o => {
    if (!search) return true
    return (
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.phone?.includes(search)
    )
  })

  async function handleAdvanceStatus(order: Order) {
    const next = STATUS_FLOW[order.status]
    if (!next) return
    await updateStatus.mutateAsync({ id: order.id, status: next as OrderStatus })
    setSelectedOrder(prev => prev?.id === order.id ? { ...prev, status: next as OrderStatus } : prev)
  }

  async function handleCancel(order: Order) {
    await cancelOrder.mutateAsync({ id: order.id, reason: cancelReason || 'Cancelled by staff' })
    setSelectedOrder(null)
    setShowCancelInput(false)
    setCancelReason('')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Orders" subtitle={isLoading ? 'Loading...' : `${filtered.length} orders`} />
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-white px-4 py-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input placeholder="Search by order # or customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize',
                    activeTab === tab
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-slate-100 text-[var(--muted-foreground)] hover:bg-slate-200'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading orders...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-[var(--muted-foreground)]">
                No orders found
              </div>
            ) : (
              filtered.map(order => (
                <button
                  key={order.id}
                  onClick={() => { setSelectedOrder(order); setShowCancelInput(false) }}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors',
                    selectedOrder?.id === order.id && 'bg-orange-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{order.order_number}</span>
                    <Badge variant={BADGE_VARIANT[order.status] ?? 'secondary'} className="capitalize text-xs">
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {getOrderTypeLabel(order.order_type)}
                      {order.table && ` · ${(order.table as { table_number: string }).table_number}`}
                      {order.customer && ` · ${order.customer.full_name ?? order.customer.phone}`}
                      {' · '}{formatDateTime(order.created_at)}
                    </span>
                    <span className="text-sm font-medium">{formatCurrency(Number(order.total_amount), 'AED')}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-80 flex flex-col bg-white shrink-0">
          {selectedOrder ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h3 className="font-semibold">{selectedOrder.order_number}</h3>
                <button onClick={() => setSelectedOrder(null)}><X className="h-4 w-4 text-[var(--muted-foreground)]" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={BADGE_VARIANT[selectedOrder.status] ?? 'secondary'} className="capitalize">
                    {selectedOrder.status}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {getOrderTypeLabel(selectedOrder.order_type)}
                  </Badge>
                  <Badge variant={selectedOrder.payment_status === 'paid' ? 'success' : 'warning'} className="capitalize">
                    {selectedOrder.payment_status}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">{formatDateTime(selectedOrder.created_at)}</p>

                {selectedOrder.customer && (
                  <div className="text-sm">
                    <p className="font-medium">{selectedOrder.customer.full_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{selectedOrder.customer.phone}</p>
                  </div>
                )}

                <Separator />

                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Items</p>
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="flex-1">
                          {item.quantity}× {item.item_name}
                          {item.variants && item.variants.length > 0 && (
                            <span className="text-xs text-[var(--muted-foreground)]"> ({item.variants[0].variant_name})</span>
                          )}
                        </span>
                        <span className="font-medium ml-2">{formatCurrency(Number(item.line_total), 'AED')}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[var(--muted-foreground)]">
                    <span>Subtotal</span><span>{formatCurrency(Number(selectedOrder.subtotal), 'AED')}</span>
                  </div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span><span>-{formatCurrency(Number(selectedOrder.discount_amount), 'AED')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[var(--muted-foreground)]">
                    <span>VAT ({selectedOrder.vat_rate}%)</span><span>{formatCurrency(Number(selectedOrder.vat_amount), 'AED')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span><span>{formatCurrency(Number(selectedOrder.total_amount), 'AED')}</span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5">
                    <p className="text-xs text-amber-700">Note: {selectedOrder.notes}</p>
                  </div>
                )}

                {selectedOrder.cancelled_reason && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-2.5">
                    <p className="text-xs text-red-700">Cancelled: {selectedOrder.cancelled_reason}</p>
                  </div>
                )}

                {/* Cancel input */}
                {showCancelInput && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Reason for cancellation..."
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowCancelInput(false)} className="flex-1">
                        Back
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleCancel(selectedOrder)} className="flex-1"
                        disabled={cancelOrder.isPending}>
                        {cancelOrder.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm Cancel'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] p-4 space-y-2">
                {STATUS_FLOW[selectedOrder.status] && (
                  <Button
                    onClick={() => handleAdvanceStatus(selectedOrder)}
                    className="w-full"
                    variant="success"
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : `Mark as ${STATUS_FLOW[selectedOrder.status]}`
                    }
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setReceiptOrder(selectedOrder)}
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </Button>
                {!['completed', 'cancelled'].includes(selectedOrder.status) && !showCancelInput && (
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setShowCancelInput(true)}
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-[var(--muted-foreground)]">
              Select an order to view details
            </div>
          )}
        </div>
      </div>

      {receiptOrder && (
        <ReceiptModal
          data={buildReceiptData(receiptOrder)}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  )
}
