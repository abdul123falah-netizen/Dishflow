'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatTime, getOrderTypeLabel } from '@/lib/utils'
import { useRecentOrders } from '@/lib/hooks/use-dashboard'
import Link from 'next/link'

const STATUS_VARIANT: Record<string, 'warning' | 'orange' | 'success' | 'secondary' | 'destructive' | 'info'> = {
  pending: 'warning', confirmed: 'info', preparing: 'orange',
  ready: 'success', completed: 'secondary', cancelled: 'destructive',
}

export function RecentOrders() {
  const { data: orders, isLoading } = useRecentOrders(6)

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Orders</CardTitle>
        <Link href="/orders" className="text-xs text-[var(--primary)] hover:underline">View all</Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div className="space-y-1">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">No orders yet today</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {orders.map((order: {
              id: string
              order_number: string
              order_type: string
              status: string
              total_amount: number
              created_at: string
              table?: { table_number: string } | null
            }) => (
              <div key={order.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium">{order.order_number}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {getOrderTypeLabel(order.order_type)}
                    {order.table && ` · ${order.table.table_number}`}
                    {' · '}{formatTime(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatCurrency(Number(order.total_amount), 'AED')}</span>
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'secondary'} className="capitalize">
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
