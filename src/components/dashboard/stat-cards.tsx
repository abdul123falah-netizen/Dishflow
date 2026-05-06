'use client'

import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Receipt, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useDashboardStats } from '@/lib/hooks/use-dashboard'

export function StatCards() {
  const { data: stats, isLoading } = useDashboardStats('today')

  const cards = [
    { label: 'Revenue Today', value: stats?.total_revenue ?? 0, currency: 'AED', change: stats?.revenue_change ?? 0, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Orders', value: stats?.total_orders ?? 0, change: stats?.orders_change ?? 0, icon: ShoppingBag, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Avg Order Value', value: stats?.avg_order_value ?? 0, currency: 'AED', change: stats?.aov_change ?? 0, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'VAT Collected', value: stats?.vat_collected ?? 0, currency: 'AED', change: 0, icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(stat => (
        <Card key={stat.label}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              {stat.change !== 0 && (
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  stat.change > 0 ? 'text-green-600' : 'text-red-500'
                )}>
                  {stat.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(stat.change)}%
                </div>
              )}
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-7 w-28 animate-pulse rounded bg-slate-200" />
              ) : (
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {stat.currency
                    ? formatCurrency(stat.value, stat.currency)
                    : stat.value.toLocaleString()
                  }
                </p>
              )}
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
