'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHourlySales } from '@/lib/hooks/use-dashboard'

export function SalesChart() {
  const { data, isLoading } = useHourlySales()

  const chartData = (data ?? []).map(h => ({
    hour: `${h.hour % 12 || 12}${h.hour < 12 ? 'am' : 'pm'}`,
    revenue: Math.round(h.revenue),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sales by Hour — Today</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[220px] items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-[var(--muted-foreground)]">
            No sales data yet today
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                formatter={(value) => [`${value} AED`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
