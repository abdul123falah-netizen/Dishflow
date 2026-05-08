import { Header } from '@/components/shared/header'
import { StatCards } from '@/components/dashboard/stat-cards'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { TopItemsTable } from '@/components/dashboard/top-items-table'
import { RecentOrders } from '@/components/dashboard/recent-orders'
import { OrderTypeChart } from '@/components/dashboard/order-type-chart'
import { LiveStatusBar } from '@/components/dashboard/live-status-bar'

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" subtitle="Today's overview" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <LiveStatusBar />
        <StatCards />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesChart />
          </div>
          <OrderTypeChart />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopItemsTable />
          <RecentOrders />
        </div>
      </div>
    </div>
  )
}
