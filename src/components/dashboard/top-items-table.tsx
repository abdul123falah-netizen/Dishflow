'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { useTopItems } from '@/lib/hooks/use-dashboard'

export function TopItemsTable() {
  const { data: items, isLoading } = useTopItems('today')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Selling Items Today</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">No sales data yet today</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-6 py-2.5 text-left text-xs font-medium text-[var(--muted-foreground)]">#</th>
                <th className="px-2 py-2.5 text-left text-xs font-medium text-[var(--muted-foreground)]">Item</th>
                <th className="px-2 py-2.5 text-right text-xs font-medium text-[var(--muted-foreground)]">Qty</th>
                <th className="px-6 py-2.5 text-right text-xs font-medium text-[var(--muted-foreground)]">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((item, i) => (
                <tr key={item.menu_item_id || item.item_name} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-[var(--muted-foreground)] font-mono text-xs">{i + 1}</td>
                  <td className="px-2 py-3 font-medium">{item.item_name}</td>
                  <td className="px-2 py-3 text-right text-[var(--muted-foreground)]">{item.total_quantity}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(item.total_revenue, 'AED')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
