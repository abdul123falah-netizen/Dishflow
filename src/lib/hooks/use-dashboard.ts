import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { DashboardStats, TopItem, HourlySales } from '@/types'

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOf(unit: 'week' | 'month') {
  const d = new Date()
  if (unit === 'week') {
    d.setDate(d.getDate() - d.getDay())
  } else {
    d.setDate(1)
  }
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function useDashboardStats(period: 'today' | 'week' | 'month' = 'today') {
  const supabase = createClient()

  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', period],
    queryFn: async () => {
      const from = period === 'today' ? startOfDay()
        : period === 'week' ? startOf('week')
        : startOf('month')

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, vat_amount, discount_amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', from)

      if (!orders) return { total_revenue: 0, total_orders: 0, avg_order_value: 0, vat_collected: 0, revenue_change: 0, orders_change: 0, aov_change: 0 }

      const total_revenue = orders.reduce((s, o) => s + Number(o.total_amount), 0)
      const total_orders = orders.length
      const avg_order_value = total_orders > 0 ? total_revenue / total_orders : 0
      const vat_collected = orders.reduce((s, o) => s + Number(o.vat_amount), 0)

      // Previous period for % change
      const periodMs = period === 'today' ? 86400000 : period === 'week' ? 604800000 : 2592000000
      const prevFrom = new Date(new Date(from).getTime() - periodMs).toISOString()

      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('created_at', prevFrom)
        .lt('created_at', from)

      const prevRevenue = prevOrders?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0
      const prevCount = prevOrders?.length ?? 0
      const prevAov = prevCount > 0 ? prevRevenue / prevCount : 0

      const pctChange = (curr: number, prev: number) =>
        prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100)

      return {
        total_revenue: Math.round(total_revenue * 100) / 100,
        total_orders,
        avg_order_value: Math.round(avg_order_value * 100) / 100,
        vat_collected: Math.round(vat_collected * 100) / 100,
        revenue_change: pctChange(total_revenue, prevRevenue),
        orders_change: pctChange(total_orders, prevCount),
        aov_change: pctChange(avg_order_value, prevAov),
      }
    },
    staleTime: 60000,
  })
}

export function useTopItems(period: 'today' | 'week' | 'month' = 'today', limit = 10) {
  const supabase = createClient()

  return useQuery<TopItem[]>({
    queryKey: ['top-items', period, limit],
    queryFn: async () => {
      const from = period === 'today' ? startOfDay()
        : period === 'week' ? startOf('week')
        : startOf('month')

      const { data } = await supabase
        .from('order_items')
        .select('menu_item_id, item_name, quantity, line_total, order:orders!inner(status, created_at)')
        .eq('order.status', 'completed')
        .gte('order.created_at', from)

      if (!data) return []

      const map = new Map<string, TopItem>()
      for (const row of data) {
        const key = row.menu_item_id ?? row.item_name
        const existing = map.get(key)
        if (existing) {
          existing.total_quantity += row.quantity
          existing.total_revenue += Number(row.line_total)
        } else {
          map.set(key, {
            menu_item_id: row.menu_item_id ?? '',
            item_name: row.item_name,
            total_quantity: row.quantity,
            total_revenue: Number(row.line_total),
          })
        }
      }

      return Array.from(map.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit)
    },
    staleTime: 60000,
  })
}

export function useHourlySales() {
  const supabase = createClient()

  return useQuery<HourlySales[]>({
    queryKey: ['hourly-sales'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', startOfDay())

      if (!data) return []

      const hours: Record<number, HourlySales> = {}
      for (let h = 0; h < 24; h++) {
        hours[h] = { hour: h, revenue: 0, orders: 0 }
      }

      for (const o of data) {
        const h = new Date(o.created_at).getHours()
        hours[h].revenue += Number(o.total_amount)
        hours[h].orders += 1
      }

      return Object.values(hours).filter(h => h.hour >= 6 && h.hour <= 23)
    },
    staleTime: 60000,
    refetchInterval: 120000,
  })
}

export function useOrderTypeSplit(period: 'today' | 'week' | 'month' = 'today') {
  const supabase = createClient()

  return useQuery({
    queryKey: ['order-type-split', period],
    queryFn: async () => {
      const from = period === 'today' ? startOfDay()
        : period === 'week' ? startOf('week')
        : startOf('month')

      const { data } = await supabase
        .from('orders')
        .select('order_type')
        .eq('status', 'completed')
        .gte('created_at', from)

      if (!data || data.length === 0) return []

      const counts: Record<string, number> = {}
      for (const o of data) {
        counts[o.order_type] = (counts[o.order_type] ?? 0) + 1
      }

      const total = data.length
      const COLORS: Record<string, string> = {
        dine_in: '#2563eb', takeaway: '#16a34a', delivery: '#ea580c',
      }
      const LABELS: Record<string, string> = {
        dine_in: 'Dine-In', takeaway: 'Takeaway', delivery: 'Delivery',
      }

      return Object.entries(counts).map(([type, count]) => ({
        name: LABELS[type] ?? type,
        value: Math.round((count / total) * 100),
        color: COLORS[type] ?? '#94a3b8',
      }))
    },
    staleTime: 60000,
  })
}

export function useRecentOrders(limit = 6) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['recent-orders', limit],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, order_type, status, total_amount, created_at, table:restaurant_tables(table_number)')
        .order('created_at', { ascending: false })
        .limit(limit)

      return data ?? []
    },
    staleTime: 30000,
    refetchInterval: 30000,
  })
}
