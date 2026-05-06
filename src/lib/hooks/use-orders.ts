import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus } from '@/types'

interface OrderFilters {
  status?: OrderStatus | 'all'
  order_type?: string
  search?: string
  from?: string
  to?: string
  limit?: number
}

export function useOrders(filters: OrderFilters = {}) {
  const supabase = createClient()

  return useQuery<Order[]>({
    queryKey: ['orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          table:restaurant_tables(table_number, capacity),
          customer:customers(id, full_name, phone),
          served_by_user:users!orders_served_by_fkey(full_name),
          items:order_items(
            *,
            variants:order_item_variants(*),
            modifiers:order_item_modifiers(*)
          ),
          transactions(*)
        `)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.order_type) {
        query = query.eq('order_type', filters.order_type)
      }
      if (filters.from) {
        query = query.gte('created_at', filters.from)
      }
      if (filters.to) {
        query = query.lte('created_at', filters.to)
      }
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return (data as Order[]) ?? []
    },
    staleTime: 15000,
    refetchInterval: 30000,
  })
}

export function useOrder(id: string) {
  const supabase = createClient()

  return useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          table:restaurant_tables(table_number, capacity),
          customer:customers(id, full_name, phone),
          served_by_user:users!orders_served_by_fkey(full_name),
          items:order_items(
            *,
            variants:order_item_variants(*),
            modifiers:order_item_modifiers(*)
          ),
          transactions(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Order
    },
    enabled: !!id,
  })
}

export function useUpdateOrderStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const updates: Record<string, unknown> = { status }
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
        updates.payment_status = 'paid'
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useCancelOrder() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', cancelled_reason: reason ?? 'Cancelled by staff' })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useCreateOrder() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: {
      order_type: string
      table_id?: string
      customer_id?: string
      notes?: string
      subtotal: number
      vat_rate: number
      vat_amount: number
      total_amount: number
      discount_type?: string
      discount_value?: number
      discount_amount?: number
      delivery_address?: string
      items: Array<{
        menu_item_id?: string
        item_name: string
        item_name_ar?: string
        unit_price: number
        quantity: number
        notes?: string
        line_total: number
        variant?: { name: string; price_modifier: number }
        modifiers?: Array<{ name: string; price: number }>
      }>
    }) => {
      // Get restaurant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('users')
        .select('restaurant_id, id')
        .eq('auth_id', user.id)
        .single()

      if (!profile) throw new Error('User profile not found')

      // Generate order number
      const { data: numData } = await supabase
        .rpc('generate_order_number', { p_restaurant_id: profile.restaurant_id })

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: profile.restaurant_id,
          order_number: numData,
          order_type: order.order_type,
          status: 'confirmed',
          payment_status: 'unpaid',
          table_id: order.table_id || null,
          customer_id: order.customer_id || null,
          served_by: profile.id || null,
          subtotal: order.subtotal,
          vat_rate: order.vat_rate,
          vat_amount: order.vat_amount,
          total_amount: order.total_amount,
          discount_type: order.discount_type,
          discount_value: order.discount_value ?? 0,
          discount_amount: order.discount_amount ?? 0,
          delivery_address: order.delivery_address,
          notes: order.notes,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const itemsToInsert = order.items.map(item => ({
        order_id: newOrder.id,
        restaurant_id: profile.restaurant_id,
        menu_item_id: item.menu_item_id || null,
        item_name: item.item_name,
        item_name_ar: item.item_name_ar,
        unit_price: item.unit_price,
        quantity: item.quantity,
        notes: item.notes,
        line_total: item.line_total,
      }))

      const { data: insertedItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)
        .select()

      if (itemsError) throw itemsError

      // Create variants and modifiers
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i]
        const insertedItem = insertedItems[i]

        if (item.variant) {
          await supabase.from('order_item_variants').insert({
            order_item_id: insertedItem.id,
            variant_name: item.variant.name,
            price_modifier: item.variant.price_modifier,
          })
        }

        if (item.modifiers && item.modifiers.length > 0) {
          await supabase.from('order_item_modifiers').insert(
            item.modifiers.map(m => ({
              order_item_id: insertedItem.id,
              modifier_name: m.name,
              price: m.price,
            }))
          )
        }
      }

      return newOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useKitchenOrders() {
  const supabase = createClient()

  return useQuery<Order[]>({
    queryKey: ['kitchen-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          table:restaurant_tables(table_number),
          items:order_items(
            *,
            variants:order_item_variants(*),
            modifiers:order_item_modifiers(*)
          )
        `)
        .in('status', ['confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data as Order[]) ?? []
    },
    refetchInterval: 12000,
    staleTime: 5000,
  })
}

export function useRecordPayment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      restaurantId,
      method,
      amount,
      reference,
    }: {
      orderId: string
      restaurantId: string
      method: string
      amount: number
      reference?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      await supabase.from('transactions').insert({
        restaurant_id: restaurantId,
        order_id: orderId,
        payment_method: method,
        amount,
        reference_number: reference,
        processed_by: profile?.id,
      })

      await supabase
        .from('orders')
        .update({ status: 'completed', payment_status: 'paid', completed_at: new Date().toISOString() })
        .eq('id', orderId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] })
    },
  })
}
