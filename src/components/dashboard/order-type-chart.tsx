'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrderTypeSplit } from '@/lib/hooks/use-dashboard'

const FALLBACK = [
  { name: 'Dine-In', value: 0, color: '#2563eb' },
  { name: 'Takeaway', value: 0, color: '#16a34a' },
  { name: 'Delivery', value: 0, color: '#ea580c' },
]

export function OrderTypeChart() {
  const { data, isLoading } = useOrderTypeSplit('today')
  const chartData = data && data.length > 0 ? data : FALLBACK

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Orders by Type</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[220px] items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}
                formatter={(value) => [`${value}%`, '']}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
