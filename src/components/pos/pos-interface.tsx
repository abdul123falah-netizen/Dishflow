'use client'

import { useState } from 'react'
import { MenuPanel } from './menu-panel'
import { OrderPanel } from './order-panel'
import { PaymentModal } from './payment-modal'
import { PosHeader } from './pos-header'
import { ReceiptModal, type ReceiptData } from '@/components/shared/receipt-modal'
import { useMenuCategories, useMenuItems } from '@/lib/hooks/use-menu'
import { useCreateOrder, useRecordPayment } from '@/lib/hooks/use-orders'
import { useTables } from '@/lib/hooks/use-settings'
import { useRestaurant } from '@/lib/context/restaurant-context'
import type { CartItem, MenuItem, OrderType } from '@/types'

export function PosInterface() {
  const { restaurant } = useRestaurant()
  const { data: categories = [] } = useMenuCategories()
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const { data: items = [] } = useMenuItems(activeCategoryId || undefined)
  const { data: tables = [] } = useTables()

  // Set default category once loaded
  if (categories.length > 0 && !activeCategoryId) {
    setActiveCategoryId(categories[0].id)
  }

  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [tableId, setTableId] = useState<string>('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [orderNote, setOrderNote] = useState('')
  const [lastOrderId, setLastOrderId] = useState<string>('')
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  const createOrder = useCreateOrder()
  const recordPayment = useRecordPayment()

  // Set default table once loaded
  if (tables.length > 0 && !tableId) {
    setTableId(tables[0].id)
  }

  function addToCart(item: MenuItem) {
    if (!item.is_available) return
    if (item.variants && item.variants.length > 0) return

    setCartItems(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id && c.selected_modifiers.length === 0)
      if (existing) {
        return prev.map(c =>
          c.menu_item_id === item.id
            ? { ...c, quantity: c.quantity + 1, line_total: (c.quantity + 1) * c.unit_price }
            : c
        )
      }
      return [...prev, {
        menu_item_id: item.id,
        item_name: item.name,
        item_name_ar: item.name_ar,
        unit_price: item.base_price,
        quantity: 1,
        selected_modifiers: [],
        line_total: item.base_price,
      }]
    })
  }

  function addToCartWithOptions(cartItem: CartItem) {
    setCartItems(prev => [...prev, cartItem])
  }

  function updateQuantity(index: number, delta: number) {
    setCartItems(prev => {
      const updated = [...prev]
      updated[index].quantity = Math.max(0, updated[index].quantity + delta)
      updated[index].line_total = updated[index].quantity * updated[index].unit_price
      return updated.filter(i => i.quantity > 0)
    })
  }

  function removeItem(index: number) {
    setCartItems(prev => prev.filter((_, i) => i !== index))
  }

  function clearCart() {
    setCartItems([])
    setOrderNote('')
    setLastOrderId('')
  }

  const subtotal = cartItems.reduce((sum, i) => sum + i.line_total, 0)
  const vatRate = restaurant?.vat_rate ?? 5
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100

  async function handleSendToKitchen() {
    if (cartItems.length === 0) return
    try {
      const order = await createOrder.mutateAsync({
        order_type: orderType,
        table_id: orderType === 'dine_in' ? tableId : undefined,
        notes: orderNote,
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        items: cartItems.map(item => ({
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          item_name_ar: item.item_name_ar,
          unit_price: item.unit_price,
          quantity: item.quantity,
          notes: item.notes,
          line_total: item.line_total,
          variant: item.selected_variant
            ? { name: item.selected_variant.name, price_modifier: item.selected_variant.price_modifier }
            : undefined,
          modifiers: item.selected_modifiers.map(m => ({ name: m.name, price: m.price })),
        })),
      })
      setLastOrderId(order.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error('Failed to create order:', msg, err)
      alert('Order failed: ' + msg)
    }
  }

  async function handlePaymentComplete(method: string, amount: number, reference?: string) {
    if (!restaurant) return

    let orderId = lastOrderId

    // If not already sent to kitchen, create the order first
    if (!orderId) {
      const order = await createOrder.mutateAsync({
        order_type: orderType,
        table_id: orderType === 'dine_in' ? tableId : undefined,
        notes: orderNote,
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        items: cartItems.map(item => ({
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          item_name_ar: item.item_name_ar,
          unit_price: item.unit_price,
          quantity: item.quantity,
          notes: item.notes,
          line_total: item.line_total,
          variant: item.selected_variant
            ? { name: item.selected_variant.name, price_modifier: item.selected_variant.price_modifier }
            : undefined,
          modifiers: item.selected_modifiers.map(m => ({ name: m.name, price: m.price })),
        })),
      })
      orderId = order.id
    }

    await recordPayment.mutateAsync({
      orderId,
      restaurantId: restaurant.id,
      method,
      amount,
      reference,
    })

    // Build receipt data before clearing cart
    const change = method === 'cash' ? Math.max(0, amount - totalAmount) : 0
    setReceiptData({
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address ?? null,
      restaurantPhone: restaurant.phone ?? null,
      vatNumber: (restaurant as any).vat_number ?? null,
      currency: restaurant.currency ?? 'AED',
      vatRate,
      orderNumber: `ORD-${orderId.slice(-6).toUpperCase()}`,
      orderType,
      tableLabel: selectedTable?.table_number ?? undefined,
      createdAt: new Date().toISOString(),
      items: cartItems.map(item => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        variant: item.selected_variant?.name,
        modifiers: item.selected_modifiers.map(m => m.name),
      })),
      subtotal,
      vatAmount,
      totalAmount,
      paymentMethod: method,
      amountPaid: amount,
      change,
    })

    clearCart()
    setShowPayment(false)
  }

  const selectedTable = tables.find(t => t.id === tableId)

  return (
    <div className="flex h-full bg-slate-100">
      <div className="flex flex-1 flex-col overflow-hidden">
        <PosHeader
          orderType={orderType}
          setOrderType={setOrderType}
          tables={tables}
          tableId={tableId}
          setTableId={setTableId}
        />
        <MenuPanel
          categories={categories}
          items={items}
          activeCategoryId={activeCategoryId}
          onCategoryChange={setActiveCategoryId}
          onAddItem={addToCart}
          onAddItemWithOptions={addToCartWithOptions}
        />
      </div>

      <OrderPanel
        orderType={orderType}
        tableLabel={selectedTable?.table_number ?? ''}
        cartItems={cartItems}
        subtotal={subtotal}
        vatAmount={vatAmount}
        totalAmount={totalAmount}
        orderNote={orderNote}
        isSaving={createOrder.isPending}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClear={clearCart}
        onNoteChange={setOrderNote}
        onPay={() => setShowPayment(true)}
        onSendToKitchen={handleSendToKitchen}
        sentToKitchen={!!lastOrderId}
      />

      {showPayment && (
        <PaymentModal
          totalAmount={totalAmount}
          currency={restaurant?.currency ?? 'AED'}
          isLoading={createOrder.isPending || recordPayment.isPending}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
        />
      )}

      {receiptData && (
        <ReceiptModal
          data={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  )
}
