import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, RestaurantTable, User } from '@/types'

export function useTables() {
  const supabase = createClient()

  return useQuery<RestaurantTable[]>({
    queryKey: ['tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('is_active', true)
        .order('table_number', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    staleTime: 60000,
  })
}

export function useAddTable() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ table_number, capacity }: { table_number: string; capacity?: number }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Not found')

      const { error } = await supabase.from('restaurant_tables').insert({
        restaurant_id: profile.restaurant_id,
        table_number,
        capacity: capacity ?? 4,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useRemoveTable() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('restaurant_tables').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useStaff() {
  const supabase = createClient()

  return useQuery<User[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    staleTime: 60000,
  })
}

export function useUpdateStaff() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<User> }) => {
      const { error } = await supabase.from('users').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export function useCreateStaff() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (staff: Partial<User>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Not found')

      const { data, error } = await supabase
        .from('users')
        .insert({ ...staff, restaurant_id: profile.restaurant_id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export function useUpdateRestaurant() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Restaurant> }) => {
      const { error } = await supabase.from('restaurants').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant'] }),
  })
}

export function useTableFloor() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['table-floor'],
    queryFn: async () => {
      const { data: tables, error: tErr } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('is_active', true)
        .order('table_number', { ascending: true })

      if (tErr) throw tErr

      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id, order_number, status, payment_status, total_amount, created_at, table_id, items:order_items(id, item_name, quantity)')
        .in('status', ['confirmed', 'preparing', 'ready'])
        .not('table_id', 'is', null)

      type ActiveOrder = NonNullable<typeof activeOrders>[number]
      const ordersByTable = new Map<string, ActiveOrder>()
      for (const order of activeOrders ?? []) {
        if (order.table_id) ordersByTable.set(order.table_id, order)
      }

      return (tables ?? []).map(table => ({
        ...table,
        activeOrder: ordersByTable.get(table.id) ?? null,
      }))
    },
    refetchInterval: 20000,
    staleTime: 10000,
  })
}

export function useReportsData(period: 'today' | 'week' | 'month' | 'last_month' = 'month') {
  const supabase = createClient()

  return useQuery({
    queryKey: ['reports', period],
    queryFn: async () => {
      const now = new Date()
      let from: Date

      if (period === 'today') {
        from = new Date(now); from.setHours(0,0,0,0)
      } else if (period === 'week') {
        from = new Date(now); from.setDate(now.getDate() - now.getDay()); from.setHours(0,0,0,0)
      } else if (period === 'last_month') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      const [ordersRes, txnsRes, topItemsRes, expensesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_amount, subtotal, vat_amount, discount_amount, order_type, payment_status, created_at')
          .eq('status', 'completed')
          .gte('created_at', from.toISOString()),
        supabase
          .from('transactions')
          .select('payment_method, amount')
          .gte('created_at', from.toISOString()),
        supabase
          .from('order_items')
          .select('item_name, quantity, line_total, order:orders!inner(status, created_at)')
          .eq('order.status', 'completed')
          .gte('order.created_at', from.toISOString()),
        supabase
          .from('expenses')
          .select('id, category, description, amount, date')
          .gte('date', from.toISOString().split('T')[0]),
      ])

      const safeOrders = ordersRes.data ?? []
      const safeTxns = txnsRes.data ?? []
      const safeItems = topItemsRes.data ?? []
      const safeExpenses = expensesRes.data ?? []

      const gross_revenue = safeOrders.reduce((s, o) => s + Number(o.total_amount), 0)
      const vat_collected = safeOrders.reduce((s, o) => s + Number(o.vat_amount), 0)
      const total_discounts = safeOrders.reduce((s, o) => s + Number(o.discount_amount), 0)
      const total_orders = safeOrders.length
      const avg_order_value = total_orders > 0 ? gross_revenue / total_orders : 0

      // Revenue & orders by day
      const byDay: Record<string, number> = {}
      for (const o of safeOrders) {
        const day = new Date(o.created_at).toLocaleDateString('en-US', { weekday: 'short' })
        byDay[day] = (byDay[day] ?? 0) + Number(o.total_amount)
      }

      // Payment breakdown
      const byPayment: Record<string, number> = {}
      for (const t of safeTxns) {
        byPayment[t.payment_method] = (byPayment[t.payment_method] ?? 0) + Number(t.amount)
      }
      const totalPaid = Object.values(byPayment).reduce((s, v) => s + v, 0)
      const paymentBreakdown = Object.entries(byPayment).map(([method, amount]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        amount: Math.round(amount * 100) / 100,
        pct: totalPaid > 0 ? Math.round((amount / totalPaid) * 100) : 0,
      }))

      // Top items
      const itemMap = new Map<string, { name: string; qty: number; revenue: number }>()
      for (const item of safeItems) {
        const existing = itemMap.get(item.item_name)
        if (existing) {
          existing.qty += item.quantity
          existing.revenue += Number(item.line_total)
        } else {
          itemMap.set(item.item_name, { name: item.item_name, qty: item.quantity, revenue: Number(item.line_total) })
        }
      }
      const topItemsList = Array.from(itemMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Orders & revenue by type
      const typeMap: Record<string, { orders: number; revenue: number }> = {
        'Dine-in': { orders: 0, revenue: 0 },
        'Takeaway': { orders: 0, revenue: 0 },
        'Delivery': { orders: 0, revenue: 0 },
      }
      for (const o of safeOrders) {
        const key = o.order_type === 'dine-in' ? 'Dine-in'
          : o.order_type === 'delivery' ? 'Delivery' : 'Takeaway'
        typeMap[key].orders++
        typeMap[key].revenue += Number(o.total_amount)
      }
      const ordersByType = Object.entries(typeMap).map(([type, v]) => ({
        type,
        orders: v.orders,
        revenue: Math.round(v.revenue * 100) / 100,
      }))

      // Hourly distribution
      const hourMap: Record<number, { orders: number; revenue: number }> = {}
      for (const o of safeOrders) {
        const h = new Date(o.created_at).getHours()
        if (!hourMap[h]) hourMap[h] = { orders: 0, revenue: 0 }
        hourMap[h].orders++
        hourMap[h].revenue += Number(o.total_amount)
      }
      const hourly = Array.from({ length: 24 }, (_, h) => ({
        hour: `${h.toString().padStart(2, '0')}:00`,
        orders: hourMap[h]?.orders ?? 0,
        revenue: Math.round((hourMap[h]?.revenue ?? 0) * 100) / 100,
      })).filter(h => h.orders > 0)

      // Expenses
      const total_expenses = safeExpenses.reduce((s, e) => s + Number(e.amount), 0)
      const expCatMap: Record<string, number> = {}
      for (const e of safeExpenses) {
        expCatMap[e.category] = (expCatMap[e.category] ?? 0) + Number(e.amount)
      }
      const expensesByCategory = Object.entries(expCatMap).map(([cat, amount]) => ({
        category: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' '),
        amount: Math.round(amount * 100) / 100,
      })).sort((a, b) => b.amount - a.amount)

      return {
        gross_revenue: Math.round(gross_revenue * 100) / 100,
        net_revenue: Math.round((gross_revenue - vat_collected) * 100) / 100,
        vat_collected: Math.round(vat_collected * 100) / 100,
        total_discounts: Math.round(total_discounts * 100) / 100,
        total_orders,
        avg_order_value: Math.round(avg_order_value * 100) / 100,
        dailyRevenue: Object.entries(byDay).map(([day, revenue]) => ({ day, revenue: Math.round(revenue * 100) / 100 })),
        paymentBreakdown,
        topItems: topItemsList,
        ordersByType,
        hourly,
        total_expenses: Math.round(total_expenses * 100) / 100,
        net_profit: Math.round((gross_revenue - total_expenses) * 100) / 100,
        expensesByCategory,
        expensesList: safeExpenses,
      }
    },
    staleTime: 60000,
  })
}

export function useAddExpense() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ category, description, amount, date }: {
      category: string; description: string; amount: number; date: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Not found')
      const { error } = await supabase.from('expenses').insert({
        restaurant_id: profile.restaurant_id, category, description, amount, date,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}

export function useDeleteExpense() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}
