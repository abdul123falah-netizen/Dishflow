'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRestaurant } from '@/lib/context/restaurant-context'
import { Loader2 } from 'lucide-react'

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const { restaurant, loading } = useRestaurant()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !restaurant) {
      router.push('/setup')
    }
  }, [loading, restaurant, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (!restaurant) return null

  return <>{children}</>
}
