import { Sidebar } from '@/components/shared/sidebar'
import { RestaurantProvider } from '@/lib/context/restaurant-context'
import { SetupGuard } from '@/components/shared/setup-guard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantProvider>
      <SetupGuard>
        <div className="flex h-screen overflow-hidden bg-slate-50">
          <Sidebar />
          <main className="flex flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </SetupGuard>
    </RestaurantProvider>
  )
}
